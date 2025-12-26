import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ActivityDialog } from "@/components/activities/activity-dialog";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { SendEmailDialog } from "@/components/email/send-email-dialog";
import { FavoriteContactButton } from "@/components/favorites/favorite-contact-button";
import { formatCurrency } from "@/lib/date-utils";
import { ContactTasks } from "@/components/contacts/contact-tasks";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  Pencil,
  Plus,
  MoreHorizontal,
} from "lucide-react";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

const typeStyles: Record<string, string> = {
  lead: "text-blue-600",
  client: "text-emerald-600",
  agent: "text-violet-600",
  vendor: "text-amber-600",
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
    <div className="min-h-screen bg-stone-50/50">
      {/* Elegant Header */}
      <header className="bg-white border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto">
          {/* Top bar with back + actions */}
          <div className="flex items-center justify-between px-6 py-4">
            <Link 
              href="/contacts" 
              className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Contacts</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <FavoriteContactButton
                contactId={contact.id}
                isFavorite={contact.isFavorite}
              />
              <ContactDialog contact={contact}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-600">
                  <Pencil className="h-4 w-4" />
                </Button>
              </ContactDialog>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-600">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Profile Section */}
          <div className="px-6 pb-8 pt-2">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-3xl font-light text-stone-500 tracking-tight">
                {contact.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + Type */}
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-3xl font-light tracking-tight text-stone-900">
                  {contact.name}
                </h1>
                <p className={`text-sm font-medium capitalize mt-1 ${typeStyles[contact.type] || "text-stone-500"}`}>
                  {contact.type}
                  {contact.source && (
                    <span className="text-stone-400 font-normal"> · via {sourceLabels[contact.source] || contact.source}</span>
                  )}
                </p>
                
                {/* Contact details - clean inline */}
                <div className="flex items-center gap-6 mt-4">
                  {contact.email && (
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
                    >
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a 
                      href={`tel:${contact.phone}`} 
                      className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
                    >
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Stats - Minimal */}
              <div className="hidden lg:flex items-center gap-8 pt-2">
                {totalDealValue > 0 && (
                  <div className="text-right">
                    <p className="text-2xl font-light text-stone-900">{formatCurrency(totalDealValue)}</p>
                    <p className="text-xs text-stone-400 mt-0.5">deal value</p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-2xl font-light text-stone-900">{activeDeals.length}</p>
                  <p className="text-xs text-stone-400 mt-0.5">active deals</p>
                </div>
              </div>
            </div>

            {/* Action Bar - Clean */}
            <div className="flex items-center gap-3 mt-8">
              <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="call">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
                  <Phone className="h-4 w-4" />
                  Call
                </button>
              </ActivityDialog>
              {contact.email && (
                <SendEmailDialog
                  contactEmail={contact.email}
                  contactId={contact.id}
                  contactName={contact.name}
                >
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </SendEmailDialog>
              )}
              <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="meeting">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
                  <Users className="h-4 w-4" />
                  Meeting
                </button>
              </ActivityDialog>
              <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="note">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
                  <FileText className="h-4 w-4" />
                  Note
                </button>
              </ActivityDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Timeline */}
            <section className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <h2 className="text-sm font-medium text-stone-900">Activity</h2>
                <ActivityDialog contactId={contact.id} contactName={contact.name}>
                  <button className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </ActivityDialog>
              </div>
              <div className="p-6">
                {contact.activities.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8">
                    No activities logged yet
                  </p>
                ) : (
                  <ActivityTimeline activities={contact.activities} />
                )}
              </div>
            </section>

            {/* Documents */}
            <section className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h2 className="text-sm font-medium text-stone-900">Documents</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-400 text-center py-4">
                  No documents yet
                </p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            {contact.notes && (
              <section className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100">
                  <h2 className="text-sm font-medium text-stone-900">Notes</h2>
                </div>
                <div className="p-5">
                  <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
                    {contact.notes}
                  </p>
                </div>
              </section>
            )}

            {/* Tasks */}
            <ContactTasks 
              contactId={contact.id}
              tasks={contact.tasks}
            />

            {/* Deals */}
            <section className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-medium text-stone-900">
                  Deals
                  {contact.deals.length > 0 && (
                    <span className="text-stone-400 font-normal ml-1.5">{contact.deals.length}</span>
                  )}
                </h2>
              </div>
              <div className="divide-y divide-stone-50">
                {contact.deals.length === 0 ? (
                  <p className="text-sm text-stone-400 p-5">No deals yet</p>
                ) : (
                  contact.deals.map((deal) => (
                    <Link 
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block px-5 py-4 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{deal.title}</p>
                          <p className="text-xs text-stone-400 mt-0.5 capitalize">
                            {deal.stage.replace("_", " ")}
                          </p>
                        </div>
                        {deal.value && (
                          <span className="text-sm font-medium text-stone-900 ml-4">
                            {formatCurrency(deal.value)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Properties */}
            {contact.properties.length > 0 && (
              <section className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100">
                  <h2 className="text-sm font-medium text-stone-900">
                    Properties
                    <span className="text-stone-400 font-normal ml-1.5">{contact.properties.length}</span>
                  </h2>
                </div>
                <div className="divide-y divide-stone-50">
                  {contact.properties.map((property) => (
                    <Link 
                      key={property.id}
                      href={`/properties/${property.id}`}
                      className="block px-5 py-4 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{property.address}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {property.city}{property.state && `, ${property.state}`}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-medium text-stone-900">
                            {formatCurrency(property.price)}
                          </p>
                          <p className="text-xs text-stone-400 capitalize mt-0.5">
                            {property.status.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
