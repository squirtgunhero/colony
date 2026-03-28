"use client";

import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Globe, Eye, Users, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SiteCardProps {
  site: {
    id: string;
    name: string;
    slug: string;
    status: string;
    views: number;
    leads: number;
    updatedAt: string;
  };
  onDelete?: (id: string) => void;
}

export function SiteCard({ site, onDelete }: SiteCardProps) {
  const { theme } = useColonyTheme();

  return (
    <div className="group relative">
      <Link href={`/marketing/sites/${site.id}`}>
        <div
          className="p-5 rounded-2xl transition-all duration-200"
          style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.06);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.03);
          }}
        >
          {/* Preview thumbnail placeholder */}
          <div
            className="h-32 rounded-xl mb-4 flex items-center justify-center"
            style={{ backgroundColor: withAlpha(theme.text, 0.04) }}
          >
            <Globe
              className="h-8 w-8"
              style={{ color: withAlpha(theme.text, 0.15) }}
              strokeWidth={1}
            />
          </div>

          {/* Title + status */}
          <div className="flex items-center gap-2 mb-2">
            <h3
              className="text-sm font-semibold truncate flex-1"
              style={{ color: theme.text }}
            >
              {site.name}
            </h3>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: withAlpha(
                  site.status === "published" ? "#30d158" : theme.text,
                  0.1
                ),
                color:
                  site.status === "published" ? "#30d158" : theme.textMuted,
              }}
            >
              {site.status}
            </span>
          </div>

          {/* Metrics */}
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: theme.textMuted }}
          >
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" strokeWidth={1.5} />
              <span>{site.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" strokeWidth={1.5} />
              <span>{site.leads}</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              <span>
                {formatDistanceToNow(new Date(site.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Delete button (visible on hover) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(site.id);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: withAlpha("#ff453a", 0.1),
            color: "#ff453a",
          }}
          title="Delete site"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
