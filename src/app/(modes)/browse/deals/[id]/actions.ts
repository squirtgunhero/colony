"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface TransactionData {
  transactionSide?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionSplit?: number;
  contractDate?: string;
  inspectionDate?: string;
  appraisalDate?: string;
  closingDate?: string;
  earnestMoney?: number;
  escrowCompany?: string;
  titleCompany?: string;
  lenderName?: string;
  loanAmount?: number;
}

export async function updateTransaction(dealId: string, data: TransactionData) {
  const userId = await requireUserId();

  await prisma.deal.updateMany({
    where: { id: dealId, userId },
    data: {
      transactionSide: data.transactionSide ?? undefined,
      commissionPercent: data.commissionPercent ?? undefined,
      commissionAmount: data.commissionAmount ?? undefined,
      commissionSplit: data.commissionSplit ?? undefined,
      contractDate: data.contractDate ? new Date(data.contractDate) : undefined,
      inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : undefined,
      appraisalDate: data.appraisalDate ? new Date(data.appraisalDate) : undefined,
      closingDate: data.closingDate ? new Date(data.closingDate) : undefined,
      earnestMoney: data.earnestMoney ?? undefined,
      escrowCompany: data.escrowCompany ?? undefined,
      titleCompany: data.titleCompany ?? undefined,
      lenderName: data.lenderName ?? undefined,
      loanAmount: data.loanAmount ?? undefined,
    },
  });

  revalidatePath(`/browse/deals/${dealId}`);
}

const DEFAULT_CLOSING_TASKS = [
  { title: "Execute purchase agreement", category: "contract", position: 0 },
  { title: "Deliver earnest money deposit", category: "contract", position: 1 },
  { title: "Order title search", category: "title", position: 2 },
  { title: "Schedule home inspection", category: "inspection", position: 3 },
  { title: "Review inspection report", category: "inspection", position: 4 },
  { title: "Negotiate repairs (if needed)", category: "inspection", position: 5 },
  { title: "Order appraisal", category: "appraisal", position: 6 },
  { title: "Review appraisal report", category: "appraisal", position: 7 },
  { title: "Submit loan application", category: "financing", position: 8 },
  { title: "Provide lender documents", category: "financing", position: 9 },
  { title: "Receive loan commitment", category: "financing", position: 10 },
  { title: "Review title commitment", category: "title", position: 11 },
  { title: "Obtain homeowner's insurance", category: "closing", position: 12 },
  { title: "Final walkthrough", category: "closing", position: 13 },
  { title: "Review closing disclosure", category: "closing", position: 14 },
  { title: "Sign closing documents", category: "closing", position: 15 },
  { title: "Wire closing funds", category: "closing", position: 16 },
  { title: "Record deed & transfer keys", category: "closing", position: 17 },
];

export async function initializeClosingChecklist(dealId: string) {
  const userId = await requireUserId();

  // Verify ownership
  const deal = await prisma.deal.findFirst({ where: { id: dealId, userId } });
  if (!deal) throw new Error("Deal not found");

  // Check if tasks already exist
  const existing = await prisma.closingTask.count({ where: { dealId } });
  if (existing > 0) return;

  await prisma.closingTask.createMany({
    data: DEFAULT_CLOSING_TASKS.map((t) => ({
      dealId,
      title: t.title,
      category: t.category,
      position: t.position,
    })),
  });

  revalidatePath(`/browse/deals/${dealId}`);
}

export async function toggleClosingTask(taskId: string, completed: boolean) {
  const userId = await requireUserId();

  const task = await prisma.closingTask.findUnique({
    where: { id: taskId },
    include: { deal: { select: { userId: true, id: true } } },
  });
  if (!task || task.deal.userId !== userId) throw new Error("Not found");

  await prisma.closingTask.update({
    where: { id: taskId },
    data: {
      isCompleted: completed,
      completedAt: completed ? new Date() : null,
    },
  });

  revalidatePath(`/browse/deals/${task.deal.id}`);
}

export async function addClosingTask(dealId: string, title: string, category: string) {
  const userId = await requireUserId();
  const deal = await prisma.deal.findFirst({ where: { id: dealId, userId } });
  if (!deal) throw new Error("Deal not found");

  const maxPos = await prisma.closingTask.aggregate({
    where: { dealId },
    _max: { position: true },
  });

  await prisma.closingTask.create({
    data: {
      dealId,
      title,
      category,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/browse/deals/${dealId}`);
}

export async function deleteClosingTask(taskId: string) {
  const userId = await requireUserId();

  const task = await prisma.closingTask.findUnique({
    where: { id: taskId },
    include: { deal: { select: { userId: true, id: true } } },
  });
  if (!task || task.deal.userId !== userId) throw new Error("Not found");

  await prisma.closingTask.delete({ where: { id: taskId } });
  revalidatePath(`/browse/deals/${task.deal.id}`);
}
