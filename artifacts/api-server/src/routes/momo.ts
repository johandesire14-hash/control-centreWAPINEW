/**
 * Mobile Money account verification routes.
 *
 * POST /api/momo/send-verification-otp
 *   Sends a verification code via Infobip 2FA (SMS) to the supplied MoMo phone number.
 *
 * POST /api/momo/verify-and-save
 *   Verifies the code via Infobip 2FA and persists the verified MoMo account for the garage.
 */

import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, garagesTable, garageMomoAccountsTable } from "@workspace/db";
import { sendVerificationPin, verifyPin } from "../lib/phoneVerification";

const router: IRouter = Router();

// ─── In-memory pinId store ────────────────────────────────────────────────────
// Keyed by phone number. Holds the Infobip pinId returned when the code was sent,
// so verify-and-save can retrieve it without the client having to pass it around.
// Fine for a single-instance server; swap for Redis if you need multi-instance.

interface PendingVerification {
  pinId: string;
  createdAt: Date;
}

const pinIdStore = new Map<string, PendingVerification>();

type Provider = "MTN" | "AIRTEL";

interface MomoValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validates a Congo MoMo phone number against operator-prefix rules.
 * Accepts the international format (+242XXXXXXXXX) or a bare 9-digit local number.
 */
function validateMomoNumber(
  phoneNumber: string,
  provider: Provider,
): MomoValidation {
  const local = phoneNumber.replace(/[\s\-]/g, "").replace(/^\+242/, "");

  if (!/^\d{9}$/.test(local)) {
    return {
      valid: false,
      error:
        "Le numéro local doit contenir exactement 9 chiffres (ex: +242066000000).",
    };
  }

  if (provider === "MTN" && !local.startsWith("06")) {
    return {
      valid: false,
      error:
        "Un numéro MTN MoMo au Congo doit commencer par 06 (ex: 066XXXXXX).",
    };
  }

  if (provider === "AIRTEL" && !local.startsWith("05")) {
    return {
      valid: false,
      error:
        "Un numéro Airtel Money au Congo doit commencer par 05 (ex: 055XXXXXX).",
    };
  }

  return { valid: true };
}

// ─── POST /api/momo/send-verification-otp ────────────────────────────────────

router.post(
  "/momo/send-verification-otp",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const { phoneNumber, provider } = req.body as Record<string, unknown>;

    if (provider !== "MTN" && provider !== "AIRTEL") {
      res.status(400).json({ error: "provider doit être 'MTN' ou 'AIRTEL'." });
      return;
    }

    if (typeof phoneNumber !== "string") {
      res.status(400).json({ error: "phoneNumber est requis." });
      return;
    }

    const validation = validateMomoNumber(phoneNumber, provider);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const { pinId } = await sendVerificationPin(phoneNumber);
      pinIdStore.set(phoneNumber, { pinId, createdAt: new Date() });
    } catch (err) {
      console.error("[momo/send-verification-otp] Infobip send failed:", err);
      res
        .status(502)
        .json({
          error: "Impossible d'envoyer le code OTP. Veuillez réessayer.",
        });
      return;
    }

    res.json({
      success: true,
      message: `Code OTP envoyé par SMS au ${phoneNumber}. Il expire dans 5 minutes.`,
    });
  },
);

// ─── POST /api/momo/verify-and-save ──────────────────────────────────────────

router.post("/momo/verify-and-save", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const { phoneNumber, provider, code } = req.body as Record<string, unknown>;

  if (provider !== "MTN" && provider !== "AIRTEL") {
    res.status(400).json({ error: "provider doit être 'MTN' ou 'AIRTEL'." });
    return;
  }

  if (typeof phoneNumber !== "string") {
    res.status(400).json({ error: "phoneNumber est requis." });
    return;
  }

  const validation = validateMomoNumber(phoneNumber, provider);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  if (typeof code !== "string" || !code.trim()) {
    res.status(400).json({ error: "code OTP requis." });
    return;
  }

  // ── Verify code via Infobip ─────────────────────────────────────────────
  const pending = pinIdStore.get(phoneNumber);

  if (!pending) {
    res.status(400).json({
      error:
        "Aucun code OTP en attente pour ce numéro. Veuillez en demander un nouveau.",
    });
    return;
  }

  let verified: boolean;
  let attemptsRemaining: number | undefined;

  try {
    const result = await verifyPin(pending.pinId, code.trim());
    verified = result.verified;
    attemptsRemaining = result.attemptsRemaining;
  } catch (err) {
    console.error("[momo/verify-and-save] Infobip verify failed:", err);
    res
      .status(502)
      .json({ error: "Impossible de vérifier le code. Veuillez réessayer." });
    return;
  }

  if (!verified) {
    res.status(400).json({
      error: "Code OTP incorrect.",
      attemptsRemaining,
    });
    return;
  }

  // Code valid — consume it
  pinIdStore.delete(phoneNumber);

  // ── Look up the garage owned by this user ─────────────────────────────────
  const [garage] = await db
    .select({ id: garagesTable.id })
    .from(garagesTable)
    .where(eq(garagesTable.ownerId, req.user.id))
    .limit(1);

  if (!garage) {
    res.status(404).json({
      error: "Aucun garage associé à votre compte. Créez d'abord votre garage.",
    });
    return;
  }

  // ── Upsert the verified MoMo account ─────────────────────────────────────
  // One MoMo account per (garageId, provider) pair.
  const verifiedAt = new Date();

  await db
    .insert(garageMomoAccountsTable)
    .values({
      garageId: garage.id,
      provider: provider as "MTN" | "AIRTEL",
      phoneNumber,
      isVerified: true,
      verifiedAt,
    })
    .onConflictDoUpdate({
      target: [
        garageMomoAccountsTable.garageId,
        garageMomoAccountsTable.provider,
      ],
      set: {
        phoneNumber,
        isVerified: true,
        verifiedAt,
        updatedAt: verifiedAt,
      },
    });

  res.json({
    success: true,
    message: "Compte Mobile Money vérifié et lié avec succès.",
  });
});

export default router;
