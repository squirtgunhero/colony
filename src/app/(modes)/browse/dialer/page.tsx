import { requireUserId } from "@/lib/supabase/auth";
import { DialerDashboard } from "./dialer-dashboard";

export default async function DialerPage() {
  await requireUserId();

  // Call/CallList models not yet in schema — pass empty defaults
  return (
    <DialerDashboard
      callLists={[]}
      recentCalls={[]}
      todayStats={{
        totalCalls: 0,
        connectedCalls: 0,
        totalDuration: 0,
        voiceAICalls: 0,
        appointmentsSet: 0,
      }}
    />
  );
}
