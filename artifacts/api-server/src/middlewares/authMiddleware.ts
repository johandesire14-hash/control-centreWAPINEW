import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { clearSession, getSessionId, getSession } from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    // No token in Authorization header or cookie — request is unauthenticated
    req.log?.debug({ url: req.url, method: req.method }, "auth: no session token");
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    // Token present but session not found or expired — clear stale cookie
    req.log?.warn(
      { url: req.url, method: req.method, sid: sid.slice(0, 8) + "…" },
      "auth: session token invalid or expired",
    );
    await clearSession(res, sid);
    next();
    return;
  }

  req.log?.debug(
    { url: req.url, method: req.method, userId: session.user.id },
    "auth: session valid",
  );
  req.user = session.user;
  next();
}
