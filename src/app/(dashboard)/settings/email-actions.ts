"use server";

import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEmailAccounts() {
  const userId = await requireUserId();
  
  if (!userId) {
    return [];
  }

  return prisma.emailAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      email: true,
      isDefault: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function disconnectEmailAccount(accountId: string) {
  const userId = await requireUserId();
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify account belongs to user
    const account = await prisma.emailAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    await prisma.emailAccount.delete({
      where: { id: accountId },
    });

    // If this was the default, set another as default
    if (account.isDefault) {
      const nextAccount = await prisma.emailAccount.findFirst({
        where: { userId },
      });
      if (nextAccount) {
        await prisma.emailAccount.update({
          where: { id: nextAccount.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect account:", error);
    return { success: false, error: "Failed to disconnect account" };
  }
}

export async function setDefaultEmailAccount(accountId: string) {
  const userId = await requireUserId();
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify account belongs to user
    const account = await prisma.emailAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    // Remove default from all accounts
    await prisma.emailAccount.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set new default
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { isDefault: true },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to set default account:", error);
    return { success: false, error: "Failed to set default" };
  }
}
