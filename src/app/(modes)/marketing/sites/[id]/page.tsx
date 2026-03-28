"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { SiteEditor } from "@/components/sites/SiteEditor";
import { Loader2 } from "lucide-react";

interface SiteData {
  id: string;
  name: string;
  slug: string;
  status: string;
  htmlContent: string | null;
  prompt: string | null;
}

export default function SiteEditorPage() {
  const { theme } = useColonyTheme();
  const params = useParams();
  const router = useRouter();
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    fetch(`/api/sites/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setSite)
      .catch(() => router.push("/marketing/sites"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading || !site) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading site...</span>
        </div>
      </div>
    );
  }

  return <SiteEditor site={site} />;
}
