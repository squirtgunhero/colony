import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { isQuietHours } from "@/lib/quiet-hours";

/**
 * Send an SMS alert when a new lead is created outside of the LAM.
 * Respects autopilot and quiet hours.
 */
export async function notifyNewLead({
  userId,
  contactName,
  source,
  dealValue,
}: {
  userId: string;
  contactName: string;
  source?: string | null;
  dealValue?: number | null;
}): Promise<void> {
  try {
    const userPhone = await prisma.userPhone.findUnique({
      where: { profileId: userId },
    });

    if (!userPhone) return;
    if (!userPhone.autopilotEnabled || !userPhone.verified) return;
    if (isQuietHours(userPhone.quietStart, userPhone.quietEnd)) return;

    let msg = `New lead: ${contactName}`;
    if (source) msg += ` (via ${source})`;
    if (dealValue && dealValue > 0)
      msg += `. Estimated value: $${dealValue.toLocaleString()}`;
    msg += ". I've added them to your CRM.";

    if (msg.length > 480) {
      msg = msg.slice(0, 477) + "...";
    }

    const result = await sendSMS(userPhone.phoneNumber, msg);

    await prisma.sMSMessage.create({
      data: {
        profileId: userId,
        direction: "outbound",
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: userPhone.phoneNumber,
        body: msg,
        twilioSid: result.sid,
        status: "sent",
      },
    });
  } catch (error) {
    console.error("New lead alert failed:", error);
  }
}
