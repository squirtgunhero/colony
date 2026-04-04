import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ScriptManager } from "./script-manager";

export default async function ScriptsPage() {
  const userId = await requireUserId();
  const scripts = await prisma.taraScript.findMany({
    where: { userId },
    orderBy: [{ objective: "asc" }, { createdAt: "desc" }],
  });
  return (
    <ScriptManager
      initialScripts={scripts.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
    />
  );
}
