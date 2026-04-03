// ============================================================================
// TWILIO VOICE - Browser-to-phone calling with recording
// ============================================================================

import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;
const apiKeySid = process.env.TWILIO_API_KEY_SID!;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!;

/**
 * Generate a Twilio access token for browser-based calling
 */
export function generateVoiceToken(identity: string): string {
  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: false,
  });

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity,
    ttl: 3600,
  });

  token.addGrant(voiceGrant);
  return token.toJwt();
}

/**
 * Generate TwiML for outbound call with recording enabled
 */
export function outboundCallTwiml({
  to,
  callerId,
  callSid,
}: {
  to: string;
  callerId: string;
  callSid: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const VoiceResponse = Twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const dial = response.dial({
    callerId,
    record: "record-from-answer-dual",
    recordingStatusCallback: `${appUrl}/api/calls/recording-status`,
    recordingStatusCallbackMethod: "POST",
    recordingStatusCallbackEvent: ["completed", "absent"],
  });

  dial.number(to);

  return response.toString();
}

/**
 * Validate Twilio webhook signature
 */
/**
 * Validate Twilio webhook signature
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return Twilio.validateRequest(authToken, signature, url, params);
}

/**
 * The Twilio phone number configured for this account
 */
export const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

/**
 * Generate TwiML to play a voicemail recording and hang up
 */
export function voicemailDropTwiml(recordingUrl: string): string {
  const VoiceResponse = Twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.play(recordingUrl);
  response.hangup();
  return response.toString();
}

/**
 * Modify a live call to drop a voicemail (redirect to play recording)
 */
export async function dropVoicemailOnCall(
  callSid: string,
  recordingUrl: string
): Promise<void> {
  const client = Twilio(accountSid, authToken);
  await client.calls(callSid).update({
    twiml: voicemailDropTwiml(recordingUrl),
  });
}
