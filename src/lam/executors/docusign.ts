// DocuSign Domain Executors — Send envelopes, check status
import { prisma } from "@/lib/prisma";
import {
  sendEnvelope,
  getEnvelopeStatus,
  getDefaultDocuSignAccount,
} from "@/lib/docusign";
import type { ActionExecutor } from "../types";

export const docusignExecutors: Record<string, ActionExecutor> = {
  "docusign.send_envelope": async (action, ctx) => {
    if (action.type !== "docusign.send_envelope")
      throw new Error("Invalid action type");

    const { dealId, dealTitle, documentUrl, subject, signers } =
      action.payload as {
        dealId?: string;
        dealTitle?: string;
        documentUrl?: string;
        subject: string;
        signers: Array<{ name: string; email: string }>;
      };

    const dsAccount = await getDefaultDocuSignAccount(ctx.user_id);
    if (!dsAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error:
          "No DocuSign account connected. Go to Settings > Integrations to connect DocuSign.",
      };
    }

    // Resolve deal by title if needed
    let resolvedDealId = dealId;
    if (!resolvedDealId && dealTitle) {
      const deal = await prisma.deal.findFirst({
        where: {
          userId: ctx.user_id,
          title: { contains: dealTitle, mode: "insensitive" },
        },
        select: { id: true },
      });
      resolvedDealId = deal?.id;
    }

    const result = await sendEnvelope({
      docuSignAccountId: dsAccount.id,
      subject,
      signers,
      documentUrl,
      dealId: resolvedDealId,
    });

    // Create activity
    await prisma.activity.create({
      data: {
        userId: ctx.user_id,
        type: "docusign",
        title: `DocuSign envelope sent: ${subject}`,
        description: `Sent to ${signers.map((s) => s.name).join(", ")}`,
        dealId: resolvedDealId ?? undefined,
      },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        envelopeId: result.envelopeId,
        status: result.status,
        message: `DocuSign envelope sent to ${signers.map((s) => s.name).join(", ")} for signing`,
      },
    };
  },

  "docusign.check_status": async (action, ctx) => {
    if (action.type !== "docusign.check_status")
      throw new Error("Invalid action type");

    const { envelopeId, dealId, dealTitle } = action.payload as {
      envelopeId?: string;
      dealId?: string;
      dealTitle?: string;
    };

    const dsAccount = await getDefaultDocuSignAccount(ctx.user_id);
    if (!dsAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No DocuSign account connected.",
      };
    }

    // Find envelopes to check
    let envelopes;
    if (envelopeId) {
      envelopes = await prisma.docuSignEnvelope.findMany({
        where: { envelopeId, docuSignAccountId: dsAccount.id },
      });
    } else if (dealId || dealTitle) {
      let resolvedDealId = dealId;
      if (!resolvedDealId && dealTitle) {
        const deal = await prisma.deal.findFirst({
          where: {
            userId: ctx.user_id,
            title: { contains: dealTitle, mode: "insensitive" },
          },
          select: { id: true },
        });
        resolvedDealId = deal?.id;
      }
      if (resolvedDealId) {
        envelopes = await prisma.docuSignEnvelope.findMany({
          where: { dealId: resolvedDealId, docuSignAccountId: dsAccount.id },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (!envelopes || envelopes.length === 0) {
      // Fetch all recent envelopes
      envelopes = await prisma.docuSignEnvelope.findMany({
        where: { docuSignAccountId: dsAccount.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    }

    // Refresh status from DocuSign API for non-completed envelopes
    const results = await Promise.all(
      envelopes.map(async (env) => {
        if (["completed", "declined", "voided"].includes(env.status)) {
          return {
            envelopeId: env.envelopeId,
            subject: env.subject,
            status: env.status,
            sentAt: env.sentAt,
            completedAt: env.completedAt,
            recipients: env.recipients,
          };
        }

        try {
          const live = await getEnvelopeStatus(dsAccount.id, env.envelopeId);
          // Update local record
          await prisma.docuSignEnvelope.update({
            where: { envelopeId: env.envelopeId },
            data: {
              status: live.status,
              recipients: live.recipients,
              ...(live.status === "completed" ? { completedAt: new Date() } : {}),
            },
          });
          return {
            envelopeId: env.envelopeId,
            subject: env.subject,
            status: live.status,
            sentAt: env.sentAt,
            recipients: live.recipients,
          };
        } catch {
          return {
            envelopeId: env.envelopeId,
            subject: env.subject,
            status: env.status,
            sentAt: env.sentAt,
            recipients: env.recipients,
          };
        }
      })
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        envelopes: results,
        total: results.length,
        message:
          results.length === 0
            ? "No DocuSign envelopes found"
            : `Found ${results.length} envelope(s)`,
      },
    };
  },
};
