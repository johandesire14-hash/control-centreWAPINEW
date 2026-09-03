import { Router } from "express";
import { sendVerificationPin, verifyPin } from "../lib/phoneVerification";
import { rateLimit } from "../middlewares/rateLimit";

const router = Router();

router.post("/auth/phone/send-code", rateLimit({ keyPrefix: "otp-send", windowMs: 15 * 60_000, max: 3 }), async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber || !/^\+?\d{8,15}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide" });
  }

  try {
    const { pinId } = await sendVerificationPin(phoneNumber);
    return res.json({ success: true, pinId });
  } catch (err: any) {
    console.error("send-code error:", err);
    return res.status(500).json({ error: "Échec de l'envoi du code" });
  }
});

router.post("/auth/phone/verify-code", rateLimit({ keyPrefix: "otp-verify", windowMs: 15 * 60_000, max: 8 }), async (req, res) => {
  const { pinId, code } = req.body;

  if (!pinId || !code) {
    return res.status(400).json({ error: "pinId et code requis" });
  }

  try {
    const result = await verifyPin(pinId, code);

    if (!result.verified) {
      return res.status(400).json({
        success: false,
        error: "Code incorrect",
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("verify-code error:", err);
    return res.status(500).json({ error: "Échec de la vérification" });
  }
});

export default router;
