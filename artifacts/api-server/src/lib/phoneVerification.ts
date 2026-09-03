const BASE_URL = process.env.INFOBIP_BASE_URL!;
const API_KEY = process.env.INFOBIP_API_KEY!;
const APP_ID = process.env.INFOBIP_2FA_APP_ID!;
const MESSAGE_ID = process.env.INFOBIP_2FA_MESSAGE_ID!;

interface SendPinResponse {
  pinId: string;
  to: string;
  ncStatus?: string;
  smsStatus?: string;
}

interface VerifyPinResponse {
  pinId: string;
  msisdn: string;
  verified: boolean;
  attemptsRemaining?: number;
}

export async function sendVerificationPin(
  phoneNumber: string
): Promise<{ pinId: string }> {
  const res = await fetch(`https://${BASE_URL}/2fa/2/pin`, {
    method: "POST",
    headers: {
      Authorization: `App ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      applicationId: APP_ID,
      messageId: MESSAGE_ID,
      from: "WapiGarage",
      to: phoneNumber,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Infobip sendVerificationPin failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as SendPinResponse;
  return { pinId: data.pinId };
}

export async function verifyPin(
  pinId: string,
  userCode: string
): Promise<{ verified: boolean; attemptsRemaining?: number }> {
  const res = await fetch(`https://${BASE_URL}/2fa/2/pin/${pinId}/verify`, {
    method: "POST",
    headers: {
      Authorization: `App ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ pin: userCode }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Infobip verifyPin failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as VerifyPinResponse;
  return {
    verified: data.verified,
    attemptsRemaining: data.attemptsRemaining,
  };}

