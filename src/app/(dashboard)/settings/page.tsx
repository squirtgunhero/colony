import { PageHeader } from "@/components/layout/page-header";
import { SettingsContent } from "@/components/settings/settings-content";

// Force dynamic rendering - auth state changes between requests
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and application settings."
      />
      <div className="p-4 sm:p-6">
        <SettingsContent />
      </div>
    </div>
  );
}

