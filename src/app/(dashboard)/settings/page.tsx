import { PageHeader } from "@/components/layout/page-header";
import { SettingsContent } from "@/components/settings/settings-content";

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

