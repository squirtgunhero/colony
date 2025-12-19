import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Generate iCal format for tasks
function generateICalEvent(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
}) {
  if (!task.dueDate) return "";

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const uid = `${task.id}@regganism-crm`;
  const dtstamp = formatDate(new Date());
  const dtstart = formatDate(task.dueDate);
  
  // Set end date to 1 hour after start for tasks
  const endDate = new Date(task.dueDate);
  endDate.setHours(endDate.getHours() + 1);
  const dtend = formatDate(endDate);

  const status = task.completed ? "COMPLETED" : "CONFIRMED";
  const priority = task.priority === "high" ? 1 : task.priority === "low" ? 9 : 5;

  return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${task.title.replace(/[,;\\]/g, "\\$&")}
DESCRIPTION:${(task.description || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n")}
STATUS:${status}
PRIORITY:${priority}
END:VEVENT
`;
}

export async function GET(request: NextRequest) {
  try {
    // Get all tasks with due dates
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { not: null },
      },
      orderBy: { dueDate: "asc" },
    });

    // Generate iCal content
    const events = tasks.map(generateICalEvent).filter(Boolean).join("");

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Colony CRM//Tasks Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Colony CRM Tasks
X-WR-TIMEZONE:UTC
${events}END:VCALENDAR`;

    return new NextResponse(icalContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="regganism-tasks.ics"',
      },
    });
  } catch (error) {
    console.error("Calendar export error:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar" },
      { status: 500 }
    );
  }
}

