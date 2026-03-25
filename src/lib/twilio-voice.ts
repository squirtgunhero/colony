import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const apiKey = process.env.TWILIO_API_KEY!;
const apiSecret = process.env.TWILIO_API_SECRET!;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER!;

/**
 * Generate an Access Token for the Twilio Voice SDK (browser).
 * Token is valid for 1 hour.
 */
export function generateVoiceToken(identity: string): string {
  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity,
    ttl: 3600,
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: false, // We don't handle inbound calls yet
  });

  token.addGrant(voiceGrant);
  return token.toJwt();
}

/**
 * Generate TwiML for an outbound call from the browser to a phone number.
 */
export function outboundCallTwiml(
  toNumber: string,
  statusCallbackUrl: string
): string {
  const VoiceResponse = Twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const dial = response.dial({
    callerId: phoneNumber,
    answerOnBridge: true,
    statusCallback: statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });

  dial.number(toNumber);
  return response.toString();
}

/**
 * Generate TwiML to play a voicemail recording and hang up.
 */
export function voicemailDropTwiml(recordingUrl: string): string {
  const VoiceResponse = Twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.play(recordingUrl);
  response.hangup();
  return response.toString();
}

/**
 * Modify a live call to drop a voicemail (redirect to play recording).
 */
export async function dropVoicemailOnCall(
  callSid: string,
  recordingUrl: string
): Promise<void> {
  const client = Twilio(accountSid, process.env.TWILIO_AUTH_TOKEN!);
  await client.calls(callSid).update({
    twiml: voicemailDropTwiml(recordingUrl),
  });
}

export { phoneNumber as twilioPhoneNumber };
