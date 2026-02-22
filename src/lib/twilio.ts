import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

export const twilioClient = Twilio(accountSid, authToken);

export async function sendSMS(to: string, body: string) {
  return twilioClient.messages.create({
    to,
    from: fromNumber,
    body,
  });
}
