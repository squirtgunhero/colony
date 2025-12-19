"use client";

import { useState } from "react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { deleteDocument } from "@/app/(dashboard)/documents/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const typeColors: Record<string, string> = {
  contract: "bg-blue-100 text-blue-600",
  disclosure: "bg-amber-100 text-amber-600",
  inspection: "bg-purple-100 text-purple-600",
  photo: "bg-green-100 text-green-600",
  other: "bg-neutral-100 text-neutral-600",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, title = "Documents" }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-12 w-12 text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500">No documents yet</p>
            <p className="text-xs text-neutral-400 mt-1">
              Upload contracts, disclosures, or photos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          {title}
          <span className="text-sm font-normal text-neutral-500">
            ({documents.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => {
            const Icon = typeIcons[doc.type] || File;
            const colorClass = typeColors[doc.type] || "bg-neutral-100 text-neutral-600";

            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors",
                  deletingId === doc.id && "opacity-50"
                )}
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="capitalize">{doc.type}</span>
                    {doc.size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(doc.createdAt)}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
      </CardContent>
    </Card>
  );
}

