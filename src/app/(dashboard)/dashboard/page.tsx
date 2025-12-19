import { prisma } from "@/lib/prisma";
import { LeadCards } from "@/components/dashboard/lead-cards";
import { TasksCalendar } from "@/components/dashboard/tasks-calendar";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { LeadDetailPanel } from "@/components/dashboard/lead-detail-panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PipelineBarChart } from "@/components/dashboard/charts/pipeline-bar-chart";
import { LeadSourcesChart } from "@/components/dashboard/charts/lead-sources-chart";
import { DealsTrendChart } from "@/components/dashboard/charts/deals-trend-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

async function getLeads() {
  return prisma.contact.findMany({
    where: { type: { in: ["lead", "client"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      properties: { take: 1 },
      deals: { take: 1 },
    },
  });
}

async function getDeals() {
  return prisma.deal.findMany({
    include: {
      contact: true,
      property: true,
    },
  });
}

async function getTasks() {
  return prisma.task.findMany({
    where: { completed: false },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
}

async function getStats() {
  const [totalValue, leadsCount, pendingTasks] = await Promise.all([
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.contact.count({ where: { type: "lead" } }),
    prisma.task.count({ where: { completed: false } }),
  ]);

  return {
    pipelineValue: totalValue._sum.value || 0,
    leadsCount,
    pendingTasks,
  };
}

async function getRecentActivities() {
  return prisma.activity.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      deal: true,
    },
  });
}

async function getLeadSources() {
  const sources = await prisma.contact.groupBy({
    by: ["source"],
    _count: { _all: true },
    where: { source: { not: null } },
  });

  return sources
    .filter((s) => s.source !== null)
    .map((s) => ({
      name: s.source!,
      count: s._count._all,
    }));
}

export default async function DashboardPage() {
  const [leads, deals, tasks, stats, activities, leadSources] = await Promise.all([
    getLeads(),
    getDeals(),
    getTasks(),
    getStats(),
    getRecentActivities(),
    getLeadSources(),
  ]);

  const previewLead = leads[0] || null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto xl:mr-[360px]">
        {/* Hero Section - Full Bleed Pipeline Value */}
        <DashboardHeader stats={stats} />

        {/* Content Grid - Primary (60%) + Secondary (40%) */}
        <div className="px-6 lg:px-8 py-8 space-y-8">
          
          {/* PRIMARY ZONE: Pipeline + Leads */}
          <div className="dashboard-grid">
            {/* Primary Column */}
            <div className="space-y-8">
              {/* Pipeline Overview - Hero Chart */}
              <PipelineBarChart deals={deals} />
              
              {/* Active Leads - Composite Surface */}
              <LeadCards leads={leads} selectedLeadId={previewLead?.id} />
            </div>

            {/* Secondary Column */}
            <div className="space-y-8">
              {/* Lead Sources */}
              <LeadSourcesChart sources={leadSources} />
              
              {/* Tasks Calendar */}
              <TasksCalendar tasks={tasks} />
            </div>
          </div>

          {/* SECONDARY ZONE: Trend + Activity */}
          <div className="dashboard-grid">
            {/* Primary Column */}
            <div className="space-y-8">
              <DealsTrendChart deals={deals} />
            </div>

            {/* Secondary Column */}
            <div className="space-y-8">
              <ActivityFeed activities={activities} />
            </div>
          </div>

          {/* Pipeline Stages - Full Width */}
          <div className="grid-full-bleed">
            <PipelineChart deals={deals} />
          </div>
        </div>
      </div>

      {/* Inspector Drawer - Fixed Right */}
      <LeadDetailPanel lead={previewLead} />
    </div>
  );
}
