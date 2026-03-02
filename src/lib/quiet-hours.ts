/**
 * Check if the current time falls within a user's quiet hours.
 * Times are in "HH:mm" format and interpreted as US Eastern (America/New_York)
 * since Colony's user base is NJ-local.
 * Returns true if we should NOT send a message right now.
 */
export function isQuietHours(
  quietStart: string | null,
  quietEnd: string | null,
): boolean {
  if (!quietStart || !quietEnd) return false;

  const now = new Date();
  const eastern = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const [nowH, nowM] = eastern.split(":").map(Number);
  const [startH, startM] = quietStart.split(":").map(Number);
  const [endH, endM] = quietEnd.split(":").map(Number);

  const nowMinutes = nowH * 60 + nowM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight range, e.g. 22:00–07:00
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}
