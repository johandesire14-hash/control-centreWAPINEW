/**
 * SMS OTP delivery via Infobip — SMS Advanced API.
 *
 * Required environment variables (set in Replit Secrets):
 *   INFOBIP_API_KEY     – Your Infobip API key (shared with WhatsApp module)
 *   INFOBIP_BASE_URL    – Your Infobip base URL (e.g. xxxxx.api.infobip.com)
 *   INFOBIP_SMS_SENDER  – Sender ID / name shown to the recipient (optional,
 *                         defaults to "WapiGarage"). Some countries require
 *                         pre-registration of alphanumeric sender IDs — if
 *                         Infobip rejects it, fall back to a numeric sender
 *                         or omit the field entirely.
 *
 * Uses the /sms/2/text/advanced endpoint (no template pre-approval required,
 * unlike WhatsApp).
 *
 * Falls back to a console mock when any credential is missing (development mode).
 */

const INFOBIP_BASE_URL = process.env["INFOBIP_BASE_URL"];
const INFOBIP_API_KEY = process.env["INFOBIP_API_KEY"];
const INFOBIP_SMS_SENDER = process.env["INFOBIP_SMS_SENDER"] ?? "WapiGarage";

// ── Startup diagnostic ────────────────────────────────────────────────────
if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
  console.warn(
    "[sms] ⚠️  INFOBIP credentials not configured — OTP will be printed to console only.\n" +
    `  INFOBIP_BASE_URL : ${INFOBIP_BASE_URL ? "✓ set" : "✗ MISSING"}\n` +
    `  INFOBIP_API_KEY  : ${INFOBIP_API_KEY  ? "✓ set" : "✗ MISSING"}`,
  );
} else {
  console.info(
    "[sms] ✓ Infobip configured — real SMS OTPs will be sent.\n" +
    `  base_url : ${INFOBIP_BASE_URL}\n` +
    `  sender   : ${INFOBIP_SMS_SENDER}`,
  );
}

/**
 * Strips leading '+', spaces, dashes, dots and parentheses from a phone number
 * so it is safe to pass to Infobip's `destinations[].to` field.
 *
 * Examples:
 *   "+242 06 47 32 120"  → "242064732120"
 *   "+33 7 58 44 80 14"  → "33758448014"
 */
function sanitizePhone(raw: string): string {
  return raw
    .replace(/^\+/, "")
    .replace(/[\s\-\.\(\)]/g, "");
}

/**
 * Sends a 6-digit OTP code to `phoneNumber` via SMS using Infobip's
 * SMS Advanced API (/sms/2/text/advanced).
 *
 * `phoneNumber` may be in international format (e.g. +242064732120) — it is
 * sanitized internally before being forwarded to Infobip.
 *
 * Falls back to a console mock when Infobip credentials are not configured.
 */
export async function sendSmsOtp(
  phoneNumber: string,
  code: string,
): Promise<void> {
  if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
    // Development / no-credentials fallback
    console.info(
      `[MOCK SMS OTP] → ${phoneNumber}  code: ${code}  (set INFOBIP_* env vars to send for real)`,
    );
    return;
  }

  const to = sanitizePhone(phoneNumber);

  const url = `https://${INFOBIP_BASE_URL}/sms/2/text/advanced`;

  const payload = {
    messages: [
      {
        destinations: [{ to }],
        from: INFOBIP_SMS_SENDER,
        text: `Votre code de vérification WapiGarage est : ${code}`,
      },
    ],
  };

  console.info(
    `[sms] → Sending OTP to ${to} via Infobip\n` +
    `  url    : ${url}\n` +
    `  sender : ${INFOBIP_SMS_SENDER}`,
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await res.text();

  console.info(
    `[sms] ← Infobip response\n` +
    `  status : ${res.status} ${res.statusText}\n` +
    `  body   : ${responseBody}`,
  );

  if (!res.ok) {
    throw new Error(`Infobip SMS error (${res.status}): ${responseBody}`);
  }
}
