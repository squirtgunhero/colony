"use client";

import { Card } from "@/components/ui/card";
import { Globe2 } from "lucide-react";
import Link from "next/link";

const SOURCE_LABELS: Record<string, string> = {
  zillow: "Zillow",
  website: "Website",
  referral: "Referral",
  social: "Social Media",
  cold_call: "Cold Call",
  open_house: "Open House",
  other: "Other",
};

interface LeadSourceCardProps {
  leadSources: { name: string; count: number }[];
}

export function LeadSourceCard({ leadSources }: LeadSourceCardProps) {
  // If no sources provided, show empty state
  if (!leadSources || leadSources.length === 0) {
    return (
      <Card className="h-full overflow-hidden border-neutral-200">
        <div className="h-full p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/5">
              <Globe2 className="h-4 w-4 text-neutral-700" />
            </div>
            <span className="font-semibold">Lead Sources</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Globe2 className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500 mb-2">No lead sources tracked yet</p>
            <p className="text-xs text-neutral-400 mb-4">
              Add contacts with a source to see where your leads come from
            </p>
            <Link
              href="/contacts"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              Add Contact
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const sources = leadSources;

  const total = sources.reduce((sum, source) => sum + source.count, 0);
  const max = Math.max(...sources.map((s) => s.count));

  return (
    <Card className="h-full overflow-hidden border-neutral-200">
      <div className="h-full p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/5">
            <Globe2 className="h-4 w-4 text-neutral-700" />
          </div>
          <span className="font-semibold">Lead Sources</span>
        </div>

        {/* Horizontal Bars */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {sources.map((source, index) => (
            <div key={source.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {SOURCE_LABELS[source.name] || source.name}
                </span>
                <span className="font-medium">{source.count}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all duration-700"
                  style={{ 
                    width: `${(source.count / max) * 100}%`,
                    opacity: 1 - (index * 0.15),
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pt-4 mt-auto border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Total Leads</span>
            <span className="text-xl font-bold">{total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
