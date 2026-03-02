import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { isQuietHours } from "@/lib/quiet-hours";

/**
 * Send an SMS alert to the referral creator when someone claims their referral.
 * Respects autopilot, referralAlertsEnabled, and quiet hours.
 */
export async function notifyReferralClaim({
  referralId,
  referralTitle,
  referralCategory,
  claimantMessage,
}: {
  referralId: string;
  referralTitle: string;
  referralCategory: string;
  claimantMessage?: string | null;
}): Promise<void> {
  try {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { createdByUserId: true },
    });

    if (!referral) return;

    const userPhone = await prisma.userPhone.findUnique({
      where: { profileId: referral.createdByUserId },
    });

    if (!userPhone) return;
    if (!userPhone.autopilotEnabled || !userPhone.verified) return;
    if (!userPhone.referralAlertsEnabled) return;
    if (isQuietHours(userPhone.quietStart, userPhone.quietEnd)) return;

    let msg = `New claim on your "${referralTitle}" referral (${referralCategory}).`;
    if (claimantMessage) {
      const truncated =
        claimantMessage.length > 200
          ? claimantMessage.slice(0, 197) + "..."
          : claimantMessage;
      msg += ` They said: "${truncated}"`;
    }
    msg += " Open Colony to review.";

    if (msg.length > 480) {
      msg = msg.slice(0, 477) + "...";
    }

    const result = await sendSMS(userPhone.phoneNumber, msg);

    await prisma.sMSMessage.create({
      data: {
        profileId: referral.createdByUserId,
        direction: "outbound",
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: userPhone.phoneNumber,
        body: msg,
        twilioSid: result.sid,
        status: "sent",
      },
    });
  } catch (error) {
    console.error("Referral claim alert failed:", error);
  }
}
