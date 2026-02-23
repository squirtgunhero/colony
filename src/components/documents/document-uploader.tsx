"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { createDocument } from "@/app/(dashboard)/documents/actions";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Upload } from "lucide-react";

interface DocumentUploaderProps {
  propertyId?: string;
  dealId?: string;
  onUploadComplete?: () => void;
}

const documentTypes: Record<string, string> = {
  "application/pdf": "contract",
  "image/jpeg": "photo",
  "image/png": "photo",
  "image/webp": "photo",
  "application/msword": "contract",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "contract",
};

export function DocumentUploader({ propertyId, dealId, onUploadComplete }: DocumentUploaderProps) {
  const { theme } = useColonyTheme();
  const [isUploading, setIsUploading] = useState(false);

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;

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
        <Upload className="h-5 w-5" style={{ color: theme.accent }} />
        Upload Documents
      </h3>
      <UploadDropzone
        endpoint="propertyDocument"
        onUploadBegin={() => setIsUploading(true)}
        onClientUploadComplete={async (res) => {
          setIsUploading(false);
          for (const file of res) {
            await createDocument({
              name: file.name,
              type: documentTypes[file.type] || "other",
              url: file.ufsUrl,
              size: file.size,
              propertyId,
              dealId,
            });
          }
          onUploadComplete?.();
        }}
        onUploadError={(error: Error) => {
          setIsUploading(false);
          console.error("Upload error:", error);
        }}
        appearance={{
          container: `border-2 border-dashed rounded-xl p-6 transition-colors`,
          uploadIcon: "hidden",
          label: "text-sm",
          allowedContent: "text-xs",
          button: "rounded-lg px-4 py-2 text-sm font-medium",
        }}
        
        content={{
          uploadIcon() {
            return (
              <Upload
                className="h-8 w-8 mb-2"
                style={{ color: theme.accent }}
              />
            );
          },
          label({ ready, isUploading: uploading }) {
            if (uploading) return <span style={{ color: theme.textMuted }}>Uploading...</span>;
            if (ready) return <span style={{ color: theme.textSoft }}>Drop files here or click to upload</span>;
            return <span style={{ color: theme.textMuted }}>Getting ready...</span>;
          },
          allowedContent() {
            return <span style={{ color: withAlpha(theme.text, 0.3) }}>PDF, Word, Images up to 16MB</span>;
          },
        }}
      />
      <style>{`
        .ut-ready-container {
          border-color: ${withAlpha(theme.accent, 0.2)} !important;
          background: transparent !important;
        }
        .ut-ready-container:hover {
          border-color: ${withAlpha(theme.accent, 0.4)} !important;
        }
        .ut-uploading-container {
          border-color: ${withAlpha(theme.accent, 0.3)} !important;
        }
        .ut-button-container button,
        [data-ut-element="button"] {
          background-color: ${theme.accent} !important;
          color: ${theme.bg} !important;
        }
      `}</style>
    </div>
  );
}
