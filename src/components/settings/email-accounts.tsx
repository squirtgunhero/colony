"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Plus, 
  Trash2, 
  Star, 
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { 
  getEmailAccounts, 
  disconnectEmailAccount, 
  setDefaultEmailAccount 
} from "@/app/(dashboard)/settings/email-actions";
import { toast } from "sonner";

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  isDefault: boolean;
  createdAt: Date;
}

export function EmailAccounts() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getEmailAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setActionLoading(accountId);
    try {
      const result = await disconnectEmailAccount(accountId);
      if (result.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
        toast.success("Account disconnected");
      } else {
        toast.error(result.error || "Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect account");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    setActionLoading(accountId);
    try {
      const result = await setDefaultEmailAccount(accountId);
      if (result.success) {
        setAccounts((prev) =>
          prev.map((a) => ({
            ...a,
            isDefault: a.id === accountId,
          }))
        );
        toast.success("Default account updated");
      } else {
        toast.error(result.error || "Failed to set default");
      }
    } catch {
      toast.error("Failed to set default account");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectGmail = () => {
    // Redirect to Gmail OAuth flow
    window.location.href = "/api/auth/gmail";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Accounts
        </CardTitle>
        <CardDescription>
          Connect your email accounts to send messages directly from your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No email accounts connected yet
            </p>
            <Button onClick={handleConnectGmail}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Gmail
            </Button>
          </div>
        ) : (
          <>
            {accounts.map((account, index) => (
              <div key={account.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{account.email}</p>
                        {account.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {account.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                        disabled={actionLoading === account.id}
                      >
                        {actionLoading === account.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-1" />
                            Set Default
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={actionLoading === account.id}
                    >
                      {actionLoading === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Separator className="my-4" />

            <Button variant="outline" onClick={handleConnectGmail}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Another Account
            </Button>
          </>
        )}

        {/* Info box */}
        <div className="mt-4 rounded-lg bg-muted/50 p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How it works</p>
              <p className="text-xs text-muted-foreground">
                When you connect your Gmail account, emails you send from Colony will appear in your Gmail Sent folder. 
                Recipients can reply directly to your email address.
              </p>
            </div>
          </div>
        </div>

        {/* Setup reminder */}
        {accounts.length === 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Setup Required</p>
                <p className="text-xs text-muted-foreground">
                  You&apos;ll need to configure Google OAuth credentials. Add <code className="bg-muted px-1 rounded">GMAIL_CLIENT_ID</code> and <code className="bg-muted px-1 rounded">GMAIL_CLIENT_SECRET</code> to your environment variables.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

