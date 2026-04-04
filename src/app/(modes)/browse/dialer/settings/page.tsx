import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ComplianceSettings } from "./compliance-settings";

export default async function DialerSettingsPage() {
  const userId = await requireUserId();

  const [settings, dncCount] = await Promise.all([
    prisma.dialerSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    }),
    prisma.dNCEntry.count({ where: { userId } }),
  ]);

  return (
    <ComplianceSettings
      initialSettings={{
        id: settings.id,
        callingHoursStart: settings.callingHoursStart,
        callingHoursEnd: settings.callingHoursEnd,
        callingTimezone: settings.callingTimezone,
        maxCallsPerDay: settings.maxCallsPerDay,
        cooldownDays: settings.cooldownDays,
        recordingConsent: settings.recordingConsent,
      }}
      initialDNCCount={dncCount}
    />
  );
}
