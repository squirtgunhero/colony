import { prisma } from "@/lib/prisma";

export async function checkDNC(userId: string, phone: string): Promise<boolean> {
  const entry = await prisma.dNCEntry.findUnique({
    where: { userId_phone: { userId, phone } },
  });
  return !!entry;
}

export async function addToDNC(userId: string, phone: string, reason: string, source: string): Promise<void> {
  await prisma.dNCEntry.upsert({
    where: { userId_phone: { userId, phone } },
    update: { reason, source },
    create: { userId, phone, reason, source },
  });
}

export async function removeFromDNC(userId: string, phone: string): Promise<void> {
  await prisma.dNCEntry.deleteMany({ where: { userId, phone } });
}

export async function isWithinCallingHours(userId: string): Promise<boolean> {
  const settings = await prisma.dialerSettings.findUnique({ where: { userId } });
  if (!settings) return true; // No settings = no restrictions

  // Get current time in the user's configured timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.callingTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const currentTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

  return currentTime >= settings.callingHoursStart && currentTime <= settings.callingHoursEnd;
}

export async function checkCooldown(userId: string, phone: string): Promise<boolean> {
  const settings = await prisma.dialerSettings.findUnique({ where: { userId } });
  if (!settings || settings.cooldownDays === 0) return true;

  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - settings.cooldownDays);

  const recentCall = await prisma.call.findFirst({
    where: {
      userId,
      toNumber: phone,
      createdAt: { gte: cooldownDate },
    },
  });

  return !recentCall; // true = OK to call (no recent call)
}
