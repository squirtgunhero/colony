import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { EmailHistory } from "@/components/email/email-history";

async function getEmailActivities() {
  return prisma.activity.findMany({
    where: {
      type: "email",
    },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
    },
    take: 100,
  });
}

async function getEmailStats() {
  const [total, thisWeek, thisMonth] = await Promise.all([
    prisma.activity.count({ where: { type: "email" } }),
    prisma.activity.count({
      where: {
        type: "email",
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.activity.count({
      where: {
        type: "email",
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return { total, thisWeek, thisMonth };
}

export default async function EmailPage() {
  const [emailActivities, stats] = await Promise.all([
    getEmailActivities(),
    getEmailStats(),
  ]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Email"
        description="View your email history and compose new messages."
      />

      <div className="p-4 sm:p-8">
        <EmailHistory emails={emailActivities} stats={stats} />
      </div>
    </div>
  );
}

