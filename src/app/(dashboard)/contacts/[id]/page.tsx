import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ActivityDialog } from "@/components/activities/activity-dialog";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { SendEmailDialog } from "@/components/email/send-email-dialog";
import { FavoriteContactButton } from "@/components/favorites/favorite-contact-button";
import { formatCurrency, formatDistanceToNow } from "@/lib/date-utils";
import { ContactTasks } from "@/components/contacts/contact-tasks";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  Pencil,
  Building2,
  Target,
  CalendarCheck2,
  Plus,
  MapPin,
  Clock,
  TrendingUp,
} from "lucide-react";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

const typeColors: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-600",
  client: "bg-green-500/20 text-green-600",
  agent: "bg-purple-500/20 text-purple-600",
  vendor: "bg-amber-500/20 text-amber-600",
};

const sourceLabels: Record<string, string> = {
  zillow: "Zillow",
  website: "Website",
  referral: "Referral",
  social: "Social Media",
  cold_call: "Cold Call",
  open_house: "Open House",
  other: "Other",
};

const stageColors: Record<string, string> = {
  new_lead: "bg-neutral-500/20 text-neutral-600",
  qualified: "bg-blue-500/20 text-blue-600",
  showing: "bg-amber-500/20 text-amber-600",
  offer: "bg-orange-500/20 text-orange-600",
  negotiation: "bg-purple-500/20 text-purple-600",
  closed: "bg-green-500/20 text-green-600",
};

const statusColors: Record<string, string> = {
  available: "bg-green-500/20 text-green-600",
  under_contract: "bg-amber-500/20 text-amber-600",
  sold: "bg-blue-500/20 text-blue-600",
  off_market: "bg-neutral-500/20 text-neutral-600",
};

async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          deal: true,
          property: true,
        },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          property: true,
        },
      },
      properties: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        orderBy: [
          { completed: "asc" },
          { dueDate: "asc" },
        ],
      },
    },
  });

  return contact;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  const contact = await getContact(id);

  if (!contact) {
    notFound();
  }

  // Calculate total deal value
  const totalDealValue = contact.deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const activeDeals = contact.deals.filter(d => d.stage !== "closed");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <Link href="/contacts">
              <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{contact.name}</h1>
                    <FavoriteContactButton
                      contactId={contact.id}
                      isFavorite={contact.isFavorite}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className={`capitalize ${typeColors[contact.type] || ""}`}
                    >
                      {contact.type}
                    </Badge>
                    {contact.source && (
                      <span className="text-xs text-muted-foreground">
                        via {sourceLabels[contact.source] || contact.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.phone}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Added {formatDistanceToNow(contact.createdAt)}
                </span>
              </div>
            </div>
            <ContactDialog contact={contact}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </ContactDialog>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-6 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalDealValue)}</p>
                <p className="text-xs text-muted-foreground">Total Deal Value</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold">{activeDeals.length}</p>
                <p className="text-xs text-muted-foreground">Active Deals</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold">{contact.properties.length}</p>
                <p className="text-xs text-muted-foreground">Properties</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <CalendarCheck2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold">{contact.tasks.length}</p>
                <p className="text-xs text-muted-foreground">Open Tasks</p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="call">
              <Button variant="outline" size="sm" className="rounded-full">
                <Phone className="h-4 w-4 mr-2" />
                Log Call
              </Button>
            </ActivityDialog>
            {contact.email && (
              <SendEmailDialog
                contactEmail={contact.email}
                contactId={contact.id}
                contactName={contact.name}
              >
                <Button variant="outline" size="sm" className="rounded-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </SendEmailDialog>
            )}
            <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="meeting">
              <Button variant="outline" size="sm" className="rounded-full">
                <Users className="h-4 w-4 mr-2" />
                Log Meeting
              </Button>
            </ActivityDialog>
            <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="note">
              <Button variant="outline" size="sm" className="rounded-full">
                <FileText className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </ActivityDialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Timeline */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Activity</CardTitle>
                <ActivityDialog contactId={contact.id} contactName={contact.name}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Activity
                  </Button>
                </ActivityDialog>
              </CardHeader>
              <CardContent>
                {contact.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No activities logged yet. Start by logging a call, email, or meeting.
                  </p>
                ) : (
                  <ActivityTimeline activities={contact.activities} />
                )}
              </CardContent>
            </Card>

            {/* Documents - placeholder for future contact documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents attached to this contact yet.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            {contact.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {contact.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            <ContactTasks 
              contactId={contact.id}
              contactName={contact.name}
              tasks={contact.tasks}
            />

            {/* Deals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Deals
                  <span className="text-sm font-normal text-muted-foreground">
                    ({contact.deals.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contact.deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deals yet</p>
                ) : (
                  <div className="space-y-3">
                    {contact.deals.map((deal) => (
                      <Link 
                        key={deal.id}
                        href={`/deals/${deal.id}`}
                        className="block p-3 -mx-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{deal.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`text-xs capitalize ${stageColors[deal.stage] || ""}`}>
                                {deal.stage.replace("_", " ")}
                              </Badge>
                              {deal.property && (
                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                  {deal.property.address}
                                </span>
                              )}
                            </div>
                          </div>
                          {deal.value && (
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(deal.value)}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Properties */}
            {contact.properties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Properties
                    <span className="text-sm font-normal text-muted-foreground">
                      ({contact.properties.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contact.properties.map((property) => (
                      <Link 
                        key={property.id}
                        href={`/properties/${property.id}`}
                        className="block p-3 -mx-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{property.address}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {property.city}
                                {property.state && `, ${property.state}`}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(property.price)}
                            </p>
                            <Badge variant="secondary" className={`text-xs capitalize ${statusColors[property.status] || ""}`}>
                              {property.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
