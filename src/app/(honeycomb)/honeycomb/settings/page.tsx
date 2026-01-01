"use client";

import { PageShell } from "@/components/honeycomb/page-shell";
import { User, Bell, Shield, Link2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/honeycomb/hooks";

export default function SettingsPage() {
  const { data, loading } = useSettings();
  const settings = data?.settings;

  return (
    <PageShell
      title="Settings"
      subtitle="Configure your Honeycomb account and preferences"
    >
      {/* Settings Navigation */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <nav className="lg:w-56 shrink-0">
          <ul className="space-y-1">
            {[
              { icon: User, label: "Profile", active: true },
              { icon: Bell, label: "Notifications" },
              { icon: Link2, label: "Integrations" },
              { icon: Shield, label: "Security" },
              { icon: Palette, label: "Appearance" },
            ].map((item) => (
              <li key={item.label}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-amber-500/10 text-amber-500"
                      : "text-neutral-400 hover:bg-[#1f1f1f] hover:text-neutral-200"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Profile Settings */}
              <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6">
                <h2 className="text-lg font-medium text-white mb-6">Profile Settings</h2>
                
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-[#1f1f1f] flex items-center justify-center overflow-hidden">
                    {settings?.profile.avatarUrl ? (
                      <img src={settings.profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-neutral-500" />
                    )}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" className="border-[#2a2a2a] bg-transparent text-neutral-300 hover:bg-[#1f1f1f]">
                      Upload Photo
                    </Button>
                    <p className="text-xs text-neutral-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      defaultValue={settings?.profile.displayName || ""}
                      className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={settings?.profile.email || ""}
                      className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    defaultValue={settings?.profile.company || ""}
                    className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="Your company name"
                  />
                </div>

                <div className="flex justify-end">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Timezone & Locale */}
              <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6">
                <h2 className="text-lg font-medium text-white mb-6">Timezone & Locale</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Timezone
                    </label>
                    <select 
                      defaultValue={settings?.timezone || "UTC"}
                      className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-neutral-300"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">America/New_York (Eastern Time)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Currency
                    </label>
                    <select 
                      defaultValue={settings?.currency || "USD"}
                      className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-neutral-300"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#161616] border border-red-900/30 rounded-xl p-6">
                <h2 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
                <p className="text-sm text-neutral-400 mb-4">
                  Permanently delete your Honeycomb account and all associated data.
                </p>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
