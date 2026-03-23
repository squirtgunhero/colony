import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncEmailAccount } from "@/lib/gmail-sync";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return Sentry.withMonitor("gmail-sync", async () => {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const accounts = await prisma.emailAccount.findMany({
      where: { provider: "gmail" },
      select: { id: true },
    });

    let synced = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        synced += await syncEmailAccount(account.id);
      } catch (error) {
        errors++;
        Sentry.captureException(error, {
          tags: { component: "cron", route: "/api/cron/gmail-sync" },
        });
        console.error(`Gmail sync failed for account ${account.id}:`, error);
      }
    }

    return Response.json({ synced, errors, total: accounts.length });
  });
}
