import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { TasksListView } from "./tasks-list-view";

async function getTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    include: {
      contact: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
  });
}

export default async function BrowseTasksPage() {
  const userId = await requireUserId();
  const tasks = await getTasks(userId);

  return <TasksListView tasks={tasks} />;
}
