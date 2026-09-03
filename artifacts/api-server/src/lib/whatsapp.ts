/**
 * WhatsApp OTP delivery via Infobip — Template API.
 *
 * Required environment variables (set in Replit Secrets):
 *   INFOBIP_API_KEY           – Your Infobip API key
 *   INFOBIP_BASE_URL          – Your Infobip base URL (e.g. xxxxx.api.infobip.com)
 *   INFOBIP_WHATSAPP_SENDER   – Registered WhatsApp sender number (digits only, e.g. 447860099299)
 *   INFOBIP_TEMPLATE_NAME     – Pre-approved WhatsApp template name (default: "otp_code")
 *
 * Uses the /whatsapp/1/message/template endpoint (Meta-compliant, required for
 * business-initiated messages outside the 24-hour session window).
 *
 * Falls back to a console mock when any credential is missing (development mode).
 */

const INFOBIP_BASE_URL = process.env["INFOBIP_BASE_URL"];
const INFOBIP_API_KEY = process.env["INFOBIP_API_KEY"];
const INFOBIP_WHATSAPP_SENDER = process.env["INFOBIP_WHATSAPP_SENDER"];
const INFOBIP_TEMPLATE_NAME = process.env["INFOBIP_TEMPLATE_NAME"] ?? "otp_code";

// ── Startup diagnostic ──────────────────────────────────────────────────────
// Logged once at module load so the console shows clearly whether real sending
// is active or mocked.
if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL || !INFOBIP_WHATSAPP_SENDER) {
  console.warn(
    "[whatsapp] ⚠️  INFOBIP credentials not configured — OTP will be printed to console only.\n" +
    `  INFOBIP_BASE_URL         : ${INFOBIP_BASE_URL          ? "✓ set" : "✗ MISSING"}\n` +
    `  INFOBIP_API_KEY          : ${INFOBIP_API_KEY           ? "✓ set" : "✗ MISSING"}\n` +
    `  INFOBIP_WHATSAPP_SENDER  : ${INFOBIP_WHATSAPP_SENDER   ? "✓ set" : "✗ MISSING"}`,
  );
} else {
  console.info(
    "[whatsapp] ✓ Infobip configured — real WhatsApp OTPs will be sent.\n" +
    `  base_url     : ${INFOBIP_BASE_URL}\n` +
    `  sender       : ${INFOBIP_WHATSAPP_SENDER}\n` +
    `  template     : ${INFOBIP_TEMPLATE_NAME}`,
  );
}

/**
 * Strips leading '+', spaces, dashes, dots and parentheses from a phone number
 * so it is safe to pass to Infobip's `to` field (digits only, e.g. 242064732120).
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
 * Sends a 6-digit OTP code to `phoneNumber` via WhatsApp using Infobip's
 * Template API (/whatsapp/1/message/template).
 *
 * `phoneNumber` may be in international format (e.g. +242064732120) — it is
 * sanitized internally before being forwarded to Infobip.
 *
 * Falls back to a console mock when Infobip credentials are not configured.
 */
export async function sendWhatsAppOtp(
  phoneNumber: string,
  code: string,
): Promise<void> {
  if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL || !INFOBIP_WHATSAPP_SENDER) {
    // Development / no-credentials fallback
    console.info(
      `[MOCK WHATSAPP OTP] → ${phoneNumber}  code: ${code}  (set INFOBIP_* env vars to send for real)`,
    );
    return;
  }

  // Infobip requires the destination number WITHOUT a leading '+'.
  const to = sanitizePhone(phoneNumber);

  const url = `https://${INFOBIP_BASE_URL}/whatsapp/1/message/template`;

  const payload = {
    messages: [
      {
        from: INFOBIP_WHATSAPP_SENDER,
        to,
        content: {
          templateName: INFOBIP_TEMPLATE_NAME,
          templateData: {
            body: {
              placeholders: [code],
            },
          },
          language: "fr",
        },
      },
    ],
  };

  console.info(
    `[whatsapp] → Sending OTP to ${to} via Infobip (template: ${INFOBIP_TEMPLATE_NAME})\n` +
    `  url    : ${url}\n` +
    `  sender : ${INFOBIP_WHATSAPP_SENDER}`,
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
    `[whatsapp] ← Infobip response\n` +
    `  status : ${res.status} ${res.statusText}\n` +
    `  body   : ${responseBody}`,
  );

  if (!res.ok) {
    throw new Error(`Infobip WhatsApp error (${res.status}): ${responseBody}`);
  }
}
