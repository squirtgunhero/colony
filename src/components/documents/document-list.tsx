"use client";

import { useState } from "react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { deleteDocument } from "@/app/(dashboard)/documents/actions";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Image,
  File,
  Download,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number | null;
  createdAt: Date;
}

interface DocumentListProps {
  documents: Document[];
  title?: string;
}

const typeIcons: Record<string, typeof FileText> = {
  contract: FileText,
  disclosure: FileText,
  inspection: FileText,
  photo: Image,
  other: File,
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, title = "Documents" }: DocumentListProps) {
  const { theme } = useColonyTheme();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const dividerColor = withAlpha(theme.text, 0.06);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: theme.bgGlow,
          boxShadow: neumorphicRaised,
        }}
      >
        <h3
          className="text-lg font-semibold flex items-center gap-2 mb-4"
          style={{ color: theme.text }}
        >
          <FolderOpen className="h-5 w-5" style={{ color: theme.accent }} />
          {title}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderOpen className="h-12 w-12 mb-3" style={{ color: theme.accent, opacity: 0.3 }} />
          <p className="text-sm" style={{ color: theme.textMuted }}>
            No documents yet
          </p>
          <p className="text-xs mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
            Upload contracts, disclosures, or photos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: theme.bgGlow,
        boxShadow: neumorphicRaised,
      }}
    >
      <h3
        className="text-lg font-semibold flex items-center gap-2 mb-4"
        style={{ color: theme.text }}
      >
        <FolderOpen className="h-5 w-5" style={{ color: theme.accent }} />
        {title}
        <span className="text-sm font-normal" style={{ color: theme.textMuted }}>
          ({documents.length})
        </span>
      </h3>
      <div className="space-y-2">
        {documents.map((doc) => {
          const Icon = typeIcons[doc.type] || File;

          return (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                deletingId === doc.id && "opacity-50"
              )}
              style={{ border: `1px solid ${dividerColor}` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.03);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
              >
                <Icon className="h-5 w-5" style={{ color: theme.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: theme.text }}>
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
                  <span className="capitalize">{doc.type}</span>
                  {doc.size && (
                    <>
                      <span>·</span>
                      <span>{formatFileSize(doc.size)}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{formatDistanceToNow(doc.createdAt)}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
                    style={{ color: theme.textMuted }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={doc.url} download={doc.name}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}
