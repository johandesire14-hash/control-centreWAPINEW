import crypto from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, oauthExchangeCodesTable, usersTable } from "@workspace/db";
import { rateLimit } from "../middlewares/rateLimit";
import {
  getSessionId,
  createSession,
  deleteSession,
  type SessionData,
} from "../lib/auth";
import {
  getDefaultMobileRedirect,
  getSafeMobileRedirect,
} from "../lib/oauthRedirect";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const OAUTH_EXCHANGE_TTL = 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

async function upsertUser(
  claims: Record<string, unknown>,
): Promise<{ user: typeof usersTable.$inferSelect; isNewUser: boolean }> {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
  };

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userData.id));

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return { user, isNewUser: !existing };
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

function getGoogleCallbackUrl(req: Request): string {
  return `${getOrigin(req)}/api/auth/google/callback`;
}

function getOAuthStateSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_STATE_SECRET || "development-oauth-state-secret";
}

function createOAuthState(mobileRedirect: string): string {
  const payload = `${randomBytes(24).toString("base64url")}.${Buffer.from(mobileRedirect).toString("base64url")}`;
  const signature = createHmac("sha256", getOAuthStateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readOAuthMobileRedirect(state: unknown): string | null {
  if (typeof state !== "string") return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [nonce, encodedRedirect, signature] = parts;
  const payload = `${nonce}.${encodedRedirect}`;
  const expected = createHmac("sha256", getOAuthStateSecret()).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return getSafeMobileRedirect(Buffer.from(encodedRedirect, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}



interface GoogleUserInfo {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

router.get("/auth/google", rateLimit({ keyPrefix: "oauth-start", windowMs: 10 * 60_000, max: 10 }), (req: Request, res: Response) => {
  const rawMobileRedirect = req.query.mobile_redirect;
  const mobileRedirect = typeof rawMobileRedirect === "string" && rawMobileRedirect.length > 0
    ? getSafeMobileRedirect(rawMobileRedirect)
    : getDefaultMobileRedirect();
  if (!mobileRedirect) {
    res.status(400).json({ error: "Missing or invalid mobile_redirect parameter" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: "Google Sign-In is not configured" });
    return;
  }

  const state = createOAuthState(mobileRedirect);
  setOidcCookie(res, "google_state", state);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", getGoogleCallbackUrl(req));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  res.redirect(authUrl.href);
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, state, error: googleError } = req.query;
  const mobileRedirect = readOAuthMobileRedirect(state);
  const expectedState = req.cookies?.google_state;

  res.clearCookie("google_state", { path: "/" });
  res.clearCookie("google_mobile_redirect", { path: "/" });

  if (!mobileRedirect) {
    res.status(400).json({ error: "Missing or invalid OAuth state" });
    return;
  }

  const failRedirect = (message: string) => {
    const url = new URL(mobileRedirect);
    url.searchParams.set("error", message);
    res.redirect(url.href);
  };

  if (googleError) {
    failRedirect(String(googleError));
    return;
  }

  if (!code || typeof code !== "string" || !state || (expectedState && state !== expectedState)) {
    failRedirect("invalid_state");
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    failRedirect("not_configured");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleCallbackUrl(req),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      req.log.error({ status: tokenRes.status, body: await tokenRes.text() }, "Google token exchange failed");
      failRedirect("token_exchange_failed");
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
    };

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      failRedirect("userinfo_failed");
      return;
    }

    const googleUser = (await userInfoRes.json()) as GoogleUserInfo;

    const { user: dbUser, isNewUser } = await upsertUser({
      sub: googleUser.sub,
      email: googleUser.email ?? null,
      first_name: googleUser.given_name ?? null,
      last_name: googleUser.family_name ?? null,
      picture: googleUser.picture ?? null,
    });

    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
      },
      access_token: tokenData.access_token,
      provider: "google" as const,
    };

    const sid = await createSession(sessionData);

    const exchangeCode = crypto.randomBytes(48).toString("base64url");
    await db.insert(oauthExchangeCodesTable).values({
      code: exchangeCode,
      sessionId: sid,
      isNewUser: String(isNewUser),
      expiresAt: new Date(Date.now() + OAUTH_EXCHANGE_TTL),
    });
    const successUrl = new URL(mobileRedirect);
    successUrl.searchParams.set("code", exchangeCode);
    res.redirect(successUrl.href);
  } catch (err) {
    req.log.error({ err }, "Google sign-in error");
    failRedirect("unexpected_error");
  }
});

router.post("/auth/mobile/exchange", rateLimit({ keyPrefix: "oauth-exchange", windowMs: 10 * 60_000, max: 10 }), async (req: Request, res: Response) => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(code)) return res.status(400).json({ error: "Code OAuth invalide." });
  const [exchange] = await db
    .delete(oauthExchangeCodesTable)
    .where(and(eq(oauthExchangeCodesTable.code, code), gt(oauthExchangeCodesTable.expiresAt, new Date())))
    .returning();
  if (!exchange) return res.status(400).json({ error: "Code OAuth expiré ou déjà utilisé." });
  return res.json({ token: exchange.sessionId, isNewUser: exchange.isNewUser === "true" });
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
