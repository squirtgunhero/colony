"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { createDocument } from "@/app/(dashboard)/documents/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image, Upload } from "lucide-react";

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
  const [isUploading, setIsUploading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <UploadDropzone
          endpoint="propertyDocument"
          onUploadBegin={() => setIsUploading(true)}
          onClientUploadComplete={async (res) => {
            setIsUploading(false);
            // Save each uploaded file to the database
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
            container: "border-2 border-dashed border-neutral-300 rounded-xl p-6 hover:border-primary/50 transition-colors",
            uploadIcon: "text-neutral-400",
            label: "text-sm text-neutral-600",
            allowedContent: "text-xs text-neutral-400",
            button: "bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90",
          }}
          content={{
            label({ ready, isUploading }) {
              if (isUploading) return "Uploading...";
              if (ready) return "Drop files here or click to upload";
              return "Getting ready...";
            },
            allowedContent() {
              return "PDF, Word, Images up to 16MB";
            },
          }}
        />
      </CardContent>
    </Card>
  );
}

