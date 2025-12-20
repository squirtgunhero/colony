import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { PropertyDialog } from "@/components/properties/property-dialog";
import { formatCurrency } from "@/lib/date-utils";
import { 
  ArrowLeft, 
  Pencil,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  User,
  Target,
  Calendar,
  Building,
  ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  available: "bg-green-500/20 text-green-600",
  under_contract: "bg-amber-500/20 text-amber-600",
  sold: "bg-blue-500/20 text-blue-600",
  off_market: "bg-neutral-500/20 text-neutral-600",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  under_contract: "Under Contract",
  sold: "Sold",
  off_market: "Off Market",
};

async function getProperty(id: string, userId: string) {
  const property = await prisma.property.findFirst({
    where: { id, userId },
    include: {
      owner: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: true,
        },
      },
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: "asc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          contact: true,
        },
      },
    },
  });

  return property;
}

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const userId = await requireUserId();
  const [property, contacts] = await Promise.all([
    getProperty(id, userId),
    getContacts(userId),
  ]);

  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <Link href="/properties">
              <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{property.address}</h1>
                <Badge
                  variant="secondary"
                  className={statusColors[property.status] || ""}
                >
                  {statusLabels[property.status] || property.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {property.city}
                  {property.state && `, ${property.state}`}
                  {property.zipCode && ` ${property.zipCode}`}
                </span>
              </div>
            </div>
            <PropertyDialog property={property} contacts={contacts}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </PropertyDialog>
          </div>

          {/* Property Stats */}
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(property.price)}</p>
                <p className="text-xs text-muted-foreground">Listing Price</p>
              </div>
            </div>
            {property.bedrooms && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Bed className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{property.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">Bedrooms</p>
                </div>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Bath className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{property.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">Bathrooms</p>
                </div>
              </div>
            )}
            {property.sqft && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Square className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{property.sqft.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Sq Ft</p>
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
            {/* Property Image */}
            {property.imageUrl && (
              <Card>
                <CardContent className="p-0">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image
                      src={property.imageUrl}
                      alt={property.address}
                      fill
                      className="object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {property.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <DocumentList 
              documents={property.documents} 
              title="Property Documents" 
            />

            {/* Document Uploader */}
            <DocumentUploader propertyId={property.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner */}
            {property.owner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={`/contacts/${property.owner.id}`}
                    className="flex items-center gap-3 p-3 -m-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {property.owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{property.owner.name}</p>
                      {property.owner.email && (
                        <p className="text-sm text-muted-foreground">{property.owner.email}</p>
                      )}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Deals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Deals
                  <span className="text-sm font-normal text-muted-foreground">
                    ({property.deals.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {property.deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deals yet</p>
                ) : (
                  <div className="space-y-3">
                    {property.deals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.contact?.name || "No contact"}
                          </p>
                        </div>
                        <div className="text-right">
                          {deal.value && (
                            <p className="text-sm font-medium">
                              {formatCurrency(deal.value)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground capitalize">
                            {deal.stage.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Tasks */}
            {property.tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Open Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {property.tasks.map((task) => (
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

            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className={statusColors[property.status] || ""}>
                    {statusLabels[property.status] || property.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Added</span>
                  <span>{formatDistanceToNow(property.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDistanceToNow(property.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

