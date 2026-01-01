"use client";

import { PageShell, KpiCard } from "@/components/honeycomb/page-shell";
import { CreditCard, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/lib/honeycomb/hooks";

export default function BillingPage() {
  const { data, loading } = useBilling();
  const billing = data?.billing;

  const planLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  return (
    <PageShell
      title="Billing"
      subtitle="Manage your subscription, payment methods, and invoices"
    >
      {/* Current Plan */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-medium text-white">Current Plan</h2>
              <span className="px-2 py-0.5 text-xs font-medium bg-neutral-800 text-neutral-400 rounded">
                {loading ? "..." : planLabels[billing?.plan ?? "free"]}
              </span>
            </div>
            <p className="text-sm text-neutral-400">
              {billing?.plan === "free" 
                ? "You're on the free plan. Upgrade to unlock more features."
                : `You're on the ${planLabels[billing?.plan ?? "free"]} plan.`}
            </p>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          label="Monthly Spend" 
          value={billing?.monthlySpend ? `$${billing.monthlySpend.toLocaleString()}` : undefined}
          loading={loading}
        />
        <KpiCard 
          label="Campaigns Used" 
          value={billing?.campaignsLimit 
            ? `${billing.campaignsUsed}/${billing.campaignsLimit}` 
            : billing?.campaignsUsed !== undefined ? billing.campaignsUsed : undefined}
          loading={loading}
        />
        <KpiCard 
          label="Credits Remaining" 
          value={billing?.creditsRemaining ?? undefined}
          loading={loading}
        />
        <KpiCard 
          label="Next Billing Date" 
          value={billing?.nextBillingDate 
            ? new Date(billing.nextBillingDate).toLocaleDateString() 
            : undefined}
          loading={loading}
        />
      </div>

      {/* Payment Methods */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Payment Methods</h2>
          <Button variant="outline" size="sm" className="border-[#2a2a2a] bg-transparent text-neutral-300 hover:bg-[#1f1f1f]">
            <Plus className="h-4 w-4 mr-1" />
            Add Method
          </Button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : billing?.paymentMethods && billing.paymentMethods.length > 0 ? (
          <div className="divide-y divide-[#1f1f1f]">
            {billing.paymentMethods.map((method) => (
              <div key={method.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="text-white">•••• {method.last4}</p>
                    {method.expiryMonth && method.expiryYear && (
                      <p className="text-sm text-neutral-400">Expires {method.expiryMonth}/{method.expiryYear}</p>
                    )}
                  </div>
                </div>
                {method.isDefault && (
                  <span className="text-xs text-amber-500">Default</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1f1f] mb-4">
              <CreditCard className="h-7 w-7 text-neutral-500" />
            </div>
            <h3 className="text-base font-medium text-white mb-1">No payment methods</h3>
            <p className="text-sm text-neutral-400 text-center max-w-sm">
              Add a payment method to upgrade your plan or add funds.
            </p>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Billing History</h2>
        </div>
        {/* Table Header */}
        <div className="border-b border-[#1f1f1f]">
          <div className="grid grid-cols-4 gap-4 px-6 py-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</span>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</span>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Amount</span>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Invoice</span>
          </div>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : billing?.invoices && billing.invoices.length > 0 ? (
          <div className="divide-y divide-[#1f1f1f]">
            {billing.invoices.map((invoice) => (
              <div key={invoice.id} className="grid grid-cols-4 gap-4 px-6 py-4">
                <span className="text-white">{new Date(invoice.date).toLocaleDateString()}</span>
                <span className="text-neutral-400">{invoice.description}</span>
                <span className="text-white">${invoice.amount.toFixed(2)}</span>
                <span>
                  {invoice.downloadUrl ? (
                    <a href={invoice.downloadUrl} className="text-amber-500 hover:underline text-sm">Download</a>
                  ) : (
                    <span className="text-neutral-500 text-sm">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1f1f] mb-4">
              <Receipt className="h-7 w-7 text-neutral-500" />
            </div>
            <h3 className="text-base font-medium text-white mb-1">No billing history</h3>
            <p className="text-sm text-neutral-400 text-center max-w-sm">
              Your invoices and payment history will appear here.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
