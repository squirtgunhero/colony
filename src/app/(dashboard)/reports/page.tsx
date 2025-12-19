import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { RevenueCard } from "@/components/reports/revenue-card";
import { PipelineCard } from "@/components/reports/pipeline-card";
import { LeadsCard } from "@/components/reports/leads-card";
import { ConversionCard } from "@/components/reports/conversion-card";
import { LeadSourceCard } from "@/components/reports/lead-source-card";
import { TopDealsCard } from "@/components/reports/top-deals-card";
import { ActivityCard } from "@/components/reports/activity-card";
import { TasksCard } from "@/components/reports/tasks-card";
import { Button } from "@/components/ui/button";
import { Download, CalendarRange } from "lucide-react";

async function getReportData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalDeals,
    closedDeals,
    totalContacts,
    newLeadsThisMonth,
    newLeadsLastMonth,
    totalProperties,
    completedTasks,
    pendingTasks,
    dealsByStage,
    recentDeals,
    leadsBySource,
  ] = await Promise.all([
    prisma.deal.count(),
    prisma.deal.count({ where: { stage: "closed" } }),
    prisma.contact.count(),
    prisma.contact.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.contact.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    prisma.property.count(),
    prisma.task.count({ where: { completed: true } }),
    prisma.task.count({ where: { completed: false } }),
    prisma.deal.groupBy({
      by: ["stage"],
      _count: true,
      _sum: { value: true },
    }),
    prisma.deal.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { contact: true, property: true },
    }),
    prisma.contact.groupBy({
      by: ["source"],
      _count: true,
    }),
  ]);

  const totalRevenue = await prisma.deal.aggregate({
    where: { stage: "closed" },
    _sum: { value: true },
  });

  const pipelineValue = await prisma.deal.aggregate({
    where: { stage: { not: "closed" } },
    _sum: { value: true },
  });

  return {
    metrics: {
      totalRevenue: totalRevenue._sum.value || 0,
      pipelineValue: pipelineValue._sum.value || 0,
      totalDeals,
      closedDeals,
      conversionRate: totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0,
      totalContacts,
      newLeadsThisMonth,
      newLeadsLastMonth,
      leadGrowth: newLeadsLastMonth > 0 
        ? Math.round(((newLeadsThisMonth - newLeadsLastMonth) / newLeadsLastMonth) * 100)
        : newLeadsThisMonth > 0 ? 100 : 0,
      totalProperties,
      completedTasks,
      pendingTasks,
      taskCompletionRate: (completedTasks + pendingTasks) > 0 
        ? Math.round((completedTasks / (completedTasks + pendingTasks)) * 100)
        : 0,
    },
    dealsByStage,
    recentDeals,
    leadSources: leadsBySource
      .filter((item) => item.source !== null)
      .map((item) => ({
        name: item.source as string,
        count: item._count,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

export default async function ReportsPage() {
  const data = await getReportData();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Reports & Analytics"
        description="Track performance metrics and gain insights into your business."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl">
            <CalendarRange className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      {/* Bento Grid Layout */}
      <div className="p-4 sm:p-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[120px]">
          {/* Revenue - Large */}
          <div className="col-span-2 row-span-2">
            <RevenueCard 
              revenue={data.metrics.totalRevenue} 
              closedDeals={data.metrics.closedDeals} 
            />
          </div>

          {/* Pipeline */}
          <div className="col-span-2 row-span-1">
            <PipelineCard 
              value={data.metrics.pipelineValue} 
              activeDeals={data.metrics.totalDeals - data.metrics.closedDeals} 
            />
          </div>

          {/* Leads */}
          <div className="col-span-1 row-span-2">
            <LeadsCard 
              newLeads={data.metrics.newLeadsThisMonth}
              totalContacts={data.metrics.totalContacts}
              growth={data.metrics.leadGrowth}
            />
          </div>

          {/* Conversion */}
          <div className="col-span-1 row-span-2">
            <ConversionCard 
              rate={data.metrics.conversionRate}
              closed={data.metrics.closedDeals}
              total={data.metrics.totalDeals}
            />
          </div>

          {/* Tasks */}
          <div className="col-span-2 row-span-1">
            <TasksCard 
              completed={data.metrics.completedTasks}
              pending={data.metrics.pendingTasks}
              rate={data.metrics.taskCompletionRate}
            />
          </div>

          {/* Lead Sources - Tall */}
          <div className="col-span-2 row-span-3">
            <LeadSourceCard leadSources={data.leadSources} />
          </div>

          {/* Top Deals - Wide */}
          <div className="col-span-2 md:col-span-4 row-span-3">
            <TopDealsCard recentDeals={data.recentDeals} />
          </div>

          {/* Activity Timeline - Full width */}
          <div className="col-span-2 md:col-span-4 lg:col-span-6 row-span-2">
            <ActivityCard recentDeals={data.recentDeals} />
          </div>
        </div>
      </div>
    </div>
  );
}
