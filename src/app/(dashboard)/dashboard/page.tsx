// HIDDEN: Phase 2 - /dashboard removed from nav; still accessible via URL and AI ("show me my dashboard")
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { LeadCards } from "@/components/dashboard/lead-cards";
import { TasksCalendar } from "@/components/dashboard/tasks-calendar";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PipelineBarChart } from "@/components/dashboard/charts/pipeline-bar-chart";
import { LeadSourcesChart } from "@/components/dashboard/charts/lead-sources-chart";
import { DealsTrendChart } from "@/components/dashboard/charts/deals-trend-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

async function getLeads(userId: string) {
  return prisma.contact.findMany({
    where: { userId, type: { in: ["lead", "client"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      properties: { take: 1 },
      deals: { take: 1 },
    },
  });
}

async function getProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    select: {
      id: true,
      address: true,
      status: true,
      price: true,
      createdAt: true,
    },
  });
}

async function getTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId, completed: false },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
}

async function getStats(userId: string) {
  // Calculate date for previous month comparison
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalValue, previousMonthValue, leadsCount, pendingTasks] = await Promise.all([
    // Current total pipeline value from properties (excluding sold)
    prisma.property.aggregate({ 
      where: { userId, status: { not: "sold" } }, 
      _sum: { price: true } 
    }),
    // Pipeline value from properties that existed at start of current month
    prisma.property.aggregate({ 
      where: { 
        userId,
        status: { not: "sold" },
        createdAt: { lt: startOfCurrentMonth }
      }, 
      _sum: { price: true } 
    }),
    prisma.contact.count({ where: { userId, type: "lead" } }),
    prisma.task.count({ where: { userId, completed: false } }),
  ]);

  const currentValue = totalValue._sum.price || 0;
  const previousValue = previousMonthValue._sum.price || 0;

  return {
    pipelineValue: currentValue,
    previousPipelineValue: previousValue,
    leadsCount,
    pendingTasks,
  };
}

async function getRecentActivities(userId: string) {
  return prisma.activity.findMany({
    where: { userId },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      deal: true,
    },
  });
}

async function getLeadSources(userId: string) {
  const sources = await prisma.contact.groupBy({
    by: ["source"],
    _count: { _all: true },
    where: { userId, source: { not: null } },
  });

  return sources
    .filter((s) => s.source !== null)
    .map((s) => ({
      name: s.source!,
      count: s._count._all,
    }));
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  
  const [leads, properties, tasks, stats, activities, leadSources] = await Promise.all([
    getLeads(userId),
    getProperties(userId),
    getTasks(userId),
    getStats(userId),
    getRecentActivities(userId),
    getLeadSources(userId),
  ]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="flex-1 overflow-auto">
        <div className="dash-fade-in dash-fade-in-1">
          <DashboardHeader stats={stats} />
        </div>

        <div className="px-6 lg:px-8 py-8 space-y-8">
          <div className="dashboard-grid">
            <div className="space-y-8">
              <div className="dash-fade-in dash-fade-in-2">
                <PipelineBarChart properties={properties} />
              </div>
              <div className="dash-fade-in dash-fade-in-4">
                <LeadCards leads={leads} />
              </div>
            </div>

            <div className="space-y-8">
              <div className="dash-fade-in dash-fade-in-3">
                <LeadSourcesChart sources={leadSources} />
              </div>
              <div className="dash-fade-in dash-fade-in-5">
                <TasksCalendar tasks={tasks} />
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="space-y-8">
              <div className="dash-fade-in dash-fade-in-5">
                <DealsTrendChart properties={properties} />
              </div>
            </div>

            <div className="space-y-8">
              <div className="dash-fade-in dash-fade-in-6">
                <ActivityFeed activities={activities} />
              </div>
            </div>
          </div>

          <div className="grid-full-bleed dash-fade-in dash-fade-in-6">
            <PipelineChart properties={properties} />
          </div>
        </div>
      </div>
    </div>
  );
}
