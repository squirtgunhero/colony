import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { TasksList } from "@/components/tasks/tasks-list";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TasksExport } from "@/components/tasks/tasks-export";
import { CalendarSync } from "@/components/calendar/calendar-sync";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

async function getTasks() {
  return prisma.task.findMany({
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      contact: true,
      property: true,
      deal: true,
    },
  });
}

async function getContacts() {
  return prisma.contact.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getProperties() {
  return prisma.property.findMany({
    select: { id: true, address: true, city: true },
    orderBy: { address: "asc" },
  });
}

async function getDeals() {
  return prisma.deal.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export default async function TasksPage() {
  const [tasks, contacts, properties, deals] = await Promise.all([
    getTasks(),
    getContacts(),
    getProperties(),
    getDeals(),
  ]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Tasks"
        description="Manage your to-dos and follow-up reminders."
      >
        <div className="flex items-center gap-2">
          <TasksExport />
          <CalendarSync />
          <TaskDialog contacts={contacts} properties={properties} deals={deals}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </TaskDialog>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-8">
        <TasksList
          tasks={tasks}
          contacts={contacts}
          properties={properties}
          deals={deals}
        />
      </div>
    </div>
  );
}

