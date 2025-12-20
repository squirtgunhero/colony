import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ActivityDialog } from "@/components/activities/activity-dialog";
import { DealDialog } from "@/components/deals/deal-dialog";
import { formatCurrency, formatDistanceToNow } from "@/lib/date-utils";
import { 
  ArrowLeft, 
  Pencil,
  DollarSign,
  User,
  Building2,
  Calendar,
  TrendingUp,
  ClipboardList,
  Plus,
} from "lucide-react";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

const stageColors: Record<string, string> = {
  new_lead: "bg-neutral-500/20 text-neutral-600",
  qualified: "bg-blue-500/20 text-blue-600",
  showing: "bg-amber-500/20 text-amber-600",
  offer: "bg-orange-500/20 text-orange-600",
  negotiation: "bg-purple-500/20 text-purple-600",
  closed: "bg-green-500/20 text-green-600",
};

const stageLabels: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer Made",
  negotiation: "Negotiation",
  closed: "Closed",
};

async function getDeal(id: string, userId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id, userId },
    include: {
      contact: true,
      property: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: "asc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          contact: true,
        },
      },
    },
  });

  return deal;
}

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    select: { id: true, address: true, city: true },
    orderBy: { address: "asc" },
  });
}

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params;
  const userId = await requireUserId();
  const [deal, contacts, properties] = await Promise.all([
    getDeal(id, userId),
    getContacts(userId),
    getProperties(userId),
  ]);

  if (!deal) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <Link href="/deals">
              <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{deal.title}</h1>
                <Badge
                  variant="secondary"
                  className={stageColors[deal.stage] || ""}
                >
                  {stageLabels[deal.stage] || deal.stage}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-muted-foreground text-sm">
                {deal.contact && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {deal.contact.name}
                  </span>
                )}
                {deal.property && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {deal.property.address}
                  </span>
                )}
              </div>
            </div>
            <DealDialog deal={deal} contacts={contacts} properties={properties}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DealDialog>
          </div>

          {/* Deal Stats */}
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {deal.value ? formatCurrency(deal.value) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Deal Value</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold capitalize">
                  {deal.stage.replace("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground">Current Stage</p>
              </div>
            </div>
            {deal.expectedCloseDate && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold">
                    {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">Expected Close</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notes */}
            {deal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {deal.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Activity</CardTitle>
{deal.contact && (
                  <ActivityDialog contactId={deal.contact.id} contactName={deal.contact.name}>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Log Activity
                    </Button>
                  </ActivityDialog>
                )}
              </CardHeader>
              <CardContent>
                {deal.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activities logged yet
                  </p>
                ) : (
                  <ActivityTimeline activities={deal.activities} />
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <DocumentList 
              documents={deal.documents} 
              title="Deal Documents" 
            />

            {/* Document Uploader */}
            <DocumentUploader dealId={deal.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact */}
            {deal.contact && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={`/contacts/${deal.contact.id}`}
                    className="flex items-center gap-3 p-3 -m-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {deal.contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{deal.contact.name}</p>
                      {deal.contact.email && (
                        <p className="text-sm text-muted-foreground">{deal.contact.email}</p>
                      )}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Property */}
            {deal.property && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={`/properties/${deal.property.id}`}
                    className="flex items-center gap-3 p-3 -m-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{deal.property.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.property.city}
                        {deal.property.state && `, ${deal.property.state}`}
                      </p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Open Tasks */}
            {deal.tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Open Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deal.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {formatDistanceToNow(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Deal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Deal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stage</span>
                  <Badge variant="secondary" className={stageColors[deal.stage] || ""}>
                    {stageLabels[deal.stage] || deal.stage}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-medium">
                    {deal.value ? formatCurrency(deal.value) : "—"}
                  </span>
                </div>
                {deal.expectedCloseDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expected Close</span>
                    <span>
                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDistanceToNow(deal.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDistanceToNow(deal.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

