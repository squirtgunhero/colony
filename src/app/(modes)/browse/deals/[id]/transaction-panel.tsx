"use client";

import { useState, useCallback } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatCurrency } from "@/lib/date-utils";
import { updateTransaction } from "./actions";
import {
  DollarSign,
  Calendar,
  Building2,
  Landmark,
  Save,
  CheckCircle,
} from "lucide-react";

interface Deal {
  id: string;
  value: number | null;
  transactionSide: string | null;
  commissionPercent: number | null;
  commissionAmount: number | null;
  commissionSplit: number | null;
  contractDate: string | null;
  inspectionDate: string | null;
  appraisalDate: string | null;
  closingDate: string | null;
  earnestMoney: number | null;
  escrowCompany: string | null;
  titleCompany: string | null;
  lenderName: string | null;
  loanAmount: number | null;
}

interface Props {
  deal: Deal;
}

const sideOptions = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "both", label: "Both" },
  { value: "referral", label: "Referral" },
];

function toDateInput(val: string | null): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function TransactionPanel({ deal }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);

  const [form, setForm] = useState({
    transactionSide: deal.transactionSide || "",
    commissionPercent: deal.commissionPercent?.toString() || "",
    commissionSplit: deal.commissionSplit?.toString() || "100",
    contractDate: toDateInput(deal.contractDate),
    inspectionDate: toDateInput(deal.inspectionDate),
    appraisalDate: toDateInput(deal.appraisalDate),
    closingDate: toDateInput(deal.closingDate),
    earnestMoney: deal.earnestMoney?.toString() || "",
    escrowCompany: deal.escrowCompany || "",
    titleCompany: deal.titleCompany || "",
    lenderName: deal.lenderName || "",
    loanAmount: deal.loanAmount?.toString() || "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dealValue = deal.value || 0;
  const commPct = parseFloat(form.commissionPercent) || 0;
  const splitPct = parseFloat(form.commissionSplit) || 100;
  const grossCommission = dealValue * (commPct / 100);
  const agentNet = grossCommission * (splitPct / 100);
  const brokerageNet = grossCommission - agentNet;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateTransaction(deal.id, {
        transactionSide: form.transactionSide || undefined,
        commissionPercent: parseFloat(form.commissionPercent) || undefined,
        commissionAmount: grossCommission || undefined,
        commissionSplit: parseFloat(form.commissionSplit) || undefined,
        contractDate: form.contractDate || undefined,
        inspectionDate: form.inspectionDate || undefined,
        appraisalDate: form.appraisalDate || undefined,
        closingDate: form.closingDate || undefined,
        earnestMoney: parseFloat(form.earnestMoney) || undefined,
        escrowCompany: form.escrowCompany || undefined,
        titleCompany: form.titleCompany || undefined,
        lenderName: form.lenderName || undefined,
        loanAmount: parseFloat(form.loanAmount) || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    setSaving(false);
  }, [deal.id, form, grossCommission]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const inputStyle = {
    backgroundColor: withAlpha(theme.text, 0.04),
    border: `1px solid ${borderColor}`,
    color: theme.text,
    fontFamily: "'DM Sans', sans-serif",
  };

  const labelStyle = { color: withAlpha(theme.text, 0.5) };

  return (
    <div className="space-y-6">
      {/* Commission Calculator */}
      <div className="rounded-xl p-5" style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4" style={{ color: theme.accent }} />
          <h3 className="text-[15px] font-medium" style={{ color: theme.text }}>Commission</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transaction Side */}
          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={labelStyle}>Side</label>
            <div className="flex gap-1.5">
              {sideOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update("transactionSide", opt.value)}
                  className="flex-1 h-9 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    backgroundColor: form.transactionSide === opt.value ? withAlpha(theme.accent, 0.15) : withAlpha(theme.text, 0.04),
                    color: form.transactionSide === opt.value ? theme.accent : withAlpha(theme.text, 0.5),
                    border: `1px solid ${form.transactionSide === opt.value ? withAlpha(theme.accent, 0.3) : borderColor}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Commission % */}
          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={labelStyle}>Commission %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.commissionPercent}
              onChange={(e) => update("commissionPercent", e.target.value)}
              placeholder="3.0"
              className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
              style={inputStyle}
            />
          </div>

          {/* Split % */}
          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={labelStyle}>Agent Split %</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.commissionSplit}
              onChange={(e) => update("commissionSplit", e.target.value)}
              placeholder="70"
              className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
              style={inputStyle}
            />
          </div>

          {/* Earnest Money */}
          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={labelStyle}>Earnest Money</label>
            <input
              type="number"
              step="100"
              min="0"
              value={form.earnestMoney}
              onChange={(e) => update("earnestMoney", e.target.value)}
              placeholder="5,000"
              className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Commission Summary */}
        {commPct > 0 && dealValue > 0 && (
          <div
            className="mt-4 grid grid-cols-3 gap-3 pt-4"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider" style={labelStyle}>Gross</p>
              <p className="text-[18px] font-semibold mt-0.5" style={{ color: theme.accent }}>
                {formatCurrency(grossCommission)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider" style={labelStyle}>Agent Net</p>
              <p className="text-[18px] font-semibold mt-0.5" style={{ color: "#22c55e" }}>
                {formatCurrency(agentNet)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider" style={labelStyle}>Brokerage</p>
              <p className="text-[18px] font-semibold mt-0.5" style={{ color: withAlpha(theme.text, 0.6) }}>
                {formatCurrency(brokerageNet)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Key Dates */}
      <div className="rounded-xl p-5" style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4" style={{ color: theme.accent }} />
          <h3 className="text-[15px] font-medium" style={{ color: theme.text }}>Key Dates</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "contractDate", label: "Contract Date" },
            { key: "inspectionDate", label: "Inspection" },
            { key: "appraisalDate", label: "Appraisal" },
            { key: "closingDate", label: "Closing Date" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={labelStyle}>{field.label}</label>
              <input
                type="date"
                value={form[field.key as keyof typeof form]}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Parties */}
      <div className="rounded-xl p-5" style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4" style={{ color: theme.accent }} />
          <h3 className="text-[15px] font-medium" style={{ color: theme.text }}>Parties & Financing</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "escrowCompany", label: "Escrow Company", icon: Building2 },
            { key: "titleCompany", label: "Title Company", icon: Building2 },
            { key: "lenderName", label: "Lender", icon: Landmark },
            { key: "loanAmount", label: "Loan Amount", icon: DollarSign, type: "number" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={labelStyle}>{field.label}</label>
              <input
                type={field.type || "text"}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => update(field.key, e.target.value)}
                placeholder={field.label}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 h-10 px-6 rounded-lg text-[13px] font-medium transition-all"
          style={{
            backgroundColor: saved ? "#22c55e" : theme.accent,
            color: theme.bg,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Transaction"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
