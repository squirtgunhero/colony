/**
 * DocuSign Connect Webhook
 *
 * Receives envelope status updates from DocuSign, updates envelope records,
 * and auto-advances deal stages when documents are completed.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { evaluateAutomations } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

const DOCUSIGN_HMAC_KEY = process.env.DOCUSIGN_HMAC_KEY;

// ---------------------------------------------------------------------------
// HMAC Verification
// ---------------------------------------------------------------------------

function verifyHmac(body: string, signature: string | null): boolean {
  if (!DOCUSIGN_HMAC_KEY || !signature) return !DOCUSIGN_HMAC_KEY; // Skip if no key configured
  const computed = crypto
    .createHmac("sha256", DOCUSIGN_HMAC_KEY)
    .update(body)
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-docusign-signature-1");

  if (!verifyHmac(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);

    const envelopeId = payload.envelopeId ?? payload.data?.envelopeId;
    const newStatus = payload.status ?? payload.data?.envelopeSummary?.status;

    if (!envelopeId) {
      return Response.json({ ok: true, message: "No envelopeId, skipping" });
    }

    // Find our envelope record
    const envelope = await prisma.docuSignEnvelope.findUnique({
      where: { envelopeId },
      include: {
        deal: { select: { id: true, stage: true, userId: true } },
        docuSignAccount: { select: { userId: true } },
      },
    });

    if (!envelope) {
      return Response.json({ ok: true, message: "Envelope not tracked" });
    }

    // Update envelope status
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      updateData.completedAt = new Date();
    }

    // Update recipients if provided
    const signers = payload.data?.envelopeSummary?.recipients?.signers;
    if (signers) {
      updateData.recipients = signers.map(
        (s: { name: string; email: string; status: string; signedDateTime?: string }) => ({
          name: s.name,
          email: s.email,
          status: s.status,
          signedAt: s.signedDateTime,
        })
      );
    }

    await prisma.docuSignEnvelope.update({
      where: { envelopeId },
      data: updateData,
    });

    const userId = envelope.docuSignAccount.userId;

    // Create activity
    await prisma.activity.create({
      data: {
        userId,
        type: "docusign",
        title: `DocuSign: ${envelope.subject ?? "Envelope"} — ${newStatus}`,
        description: `Envelope status updated to "${newStatus}"`,
        dealId: envelope.dealId ?? undefined,
      },
    });

    // Auto-advance deal stage on completion
    if (
      newStatus === "completed" &&
      envelope.deal &&
      ["offer", "negotiation"].includes(envelope.deal.stage)
    ) {
      await prisma.deal.update({
        where: { id: envelope.deal.id },
        data: { stage: "closed" },
      });

      await prisma.activity.create({
        data: {
          userId,
          type: "deal_update",
          title: "Deal auto-advanced to Closed",
          description:
            "All signatures collected — deal automatically moved to Closed stage",
          dealId: envelope.deal.id,
        },
      });

      // Fire automation
      evaluateAutomations({
        type: "deal_stage_changed",
        userId,
        dealId: envelope.deal.id,
        metadata: { fromStage: envelope.deal.stage, toStage: "closed" },
      }).catch(() => {});
    }

    return Response.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: "docusign-webhook" },
    });
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
