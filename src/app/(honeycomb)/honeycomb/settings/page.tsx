"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/honeycomb/page-shell";
import { User, Bell, Shield, Link2, Palette, RefreshCw, Trash2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings, useMetaAccounts, useMetaSync, useMetaDisconnect } from "@/lib/honeycomb/hooks";

// Facebook icon component
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

type SettingsTab = "profile" | "notifications" | "integrations" | "security" | "appearance";

// Settings content component with search params
function SettingsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { data, loading } = useSettings();
  const { data: metaAccountsData, loading: metaLoading, refetch: refetchMetaAccounts } = useMetaAccounts();
  const { sync, syncing } = useMetaSync();
  const { disconnect, disconnecting } = useMetaDisconnect();
  
  const settings = data?.settings;
  const metaAccounts = metaAccountsData?.accounts || [];

  // Handle URL params for OAuth callback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const accounts = searchParams.get("accounts");

    if (success === "meta_connected") {
      setSuccessMessage(`Successfully connected ${accounts || ""} Meta ad account${accounts === "1" ? "" : "s"}!`);
      setActiveTab("integrations");
      refetchMetaAccounts();
      // Clear message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: "Facebook authorization was denied.",
        missing_params: "Missing authorization parameters.",
        invalid_state: "Invalid authorization state. Please try again.",
        connection_failed: "Failed to connect to Facebook. Please try again.",
        auth_failed: "Authentication failed. Please log in again.",
      };
      setErrorMessage(errorMessages[error] || "An error occurred.");
      setActiveTab("integrations");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [searchParams, refetchMetaAccounts]);

  const handleConnectMeta = () => {
    window.location.href = "/api/meta/auth";
  };

  const handleSyncMeta = async (accountId?: string) => {
    try {
      await sync(accountId);
      setSuccessMessage("Sync completed successfully!");
      refetchMetaAccounts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage("Failed to sync. Please try again.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleDisconnectMeta = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this account? All synced data will be removed.")) {
      return;
    }
    try {
      await disconnect(accountId);
      setSuccessMessage("Account disconnected successfully!");
      refetchMetaAccounts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage("Failed to disconnect. Please try again.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const tabs = [
    { id: "profile" as const, icon: User, label: "Profile" },
    { id: "notifications" as const, icon: Bell, label: "Notifications" },
    { id: "integrations" as const, icon: Link2, label: "Integrations" },
    { id: "security" as const, icon: Shield, label: "Security" },
    { id: "appearance" as const, icon: Palette, label: "Appearance" },
  ];

  return (
    <PageShell
      title="Settings"
      subtitle="Configure your Honeycomb account and preferences"
    >
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Settings Navigation */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <nav className="lg:w-56 shrink-0">
          <ul className="space-y-1">
            {tabs.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
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
              {/* Profile Tab */}
              {activeTab === "profile" && (
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
                </>
              )}

              {/* Integrations Tab */}
              {activeTab === "integrations" && (
                <>
                  {/* Meta Ads Integration */}
                  <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#1877F2] flex items-center justify-center">
                          <FacebookIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Meta Ads</h3>
                          <p className="text-sm text-neutral-400">Facebook & Instagram advertising</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleConnectMeta}
                        className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
                      >
                        <FacebookIcon className="h-4 w-4 mr-2" />
                        Connect Account
                      </Button>
                    </div>

                    {metaLoading ? (
                      <div className="p-8 flex justify-center">
                        <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : metaAccounts.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="h-12 w-12 rounded-full bg-[#1f1f1f] flex items-center justify-center mx-auto mb-3">
                          <Link2 className="h-6 w-6 text-neutral-500" />
                        </div>
                        <p className="text-neutral-400 mb-2">No accounts connected</p>
                        <p className="text-sm text-neutral-500">
                          Connect your Meta Business account to sync campaigns and view real performance data.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#1f1f1f]">
                        {metaAccounts.map((account) => (
                          <div key={account.id} className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[#1f1f1f] flex items-center justify-center">
                                <FacebookIcon className="h-5 w-5 text-[#1877F2]" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {account.adAccountName || account.adAccountId}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-neutral-400">
                                  <span>{account._count.campaigns} campaigns</span>
                                  <span>•</span>
                                  <span>{account.currency}</span>
                                  {account.lastSyncedAt && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        Last synced {new Date(account.lastSyncedAt).toLocaleDateString()}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSyncMeta(account.id)}
                                disabled={syncing}
                                className="border-[#2a2a2a] bg-transparent text-neutral-300 hover:bg-[#1f1f1f]"
                              >
                                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                                Sync
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnectMeta(account.id)}
                                disabled={disconnecting}
                                className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Other Integrations */}
                  <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6">
                    <h2 className="text-lg font-medium text-white mb-6">More Integrations</h2>
                    <div className="space-y-4">
                      {[
                        { name: "Google Ads", description: "Search, Display, and YouTube advertising", available: false },
                        { name: "LinkedIn Ads", description: "B2B and professional advertising", available: false },
                        { name: "TikTok Ads", description: "Short-form video advertising", available: false },
                      ].map((integration) => (
                        <div key={integration.name} className="flex items-center justify-between p-4 border border-[#2a2a2a] rounded-lg">
                          <div>
                            <p className="text-white font-medium">{integration.name}</p>
                            <p className="text-sm text-neutral-400">{integration.description}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-[#2a2a2a] bg-transparent text-neutral-500"
                          >
                            Coming Soon
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Developer Resources */}
                  <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6">
                    <h2 className="text-lg font-medium text-white mb-4">Developer Resources</h2>
                    <p className="text-sm text-neutral-400 mb-4">
                      Set up your Meta developer account to enable the integration.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://developers.facebook.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400"
                      >
                        Meta Developer Portal
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href="https://developers.facebook.com/docs/marketing-apis"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400"
                      >
                        Marketing API Docs
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="bg-[#161616] border border-red-900/30 rounded-xl p-6">
                  <h2 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
                  <p className="text-sm text-neutral-400 mb-4">
                    Permanently delete your Honeycomb account and all associated data.
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              )}

              {/* Placeholder for other tabs */}
              {(activeTab === "notifications" || activeTab === "appearance") && (
                <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-8 text-center">
                  <p className="text-neutral-400">Coming soon...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// Loading fallback for settings page
function SettingsLoading() {
  return (
    <PageShell
      title="Settings"
      subtitle="Configure your Honeycomb account and preferences"
    >
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </PageShell>
  );
}

// Main page component with Suspense boundary
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
