import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FavoriteContactButton } from "@/components/favorites/favorite-contact-button";
import { FavoritePropertyButton } from "@/components/favorites/favorite-property-button";
import { FavoriteDealButton } from "@/components/favorites/favorite-deal-button";
import {
  User,
  Building2,
  Target,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { formatCurrency } from "@/lib/date-utils";

async function getFavorites() {
  const [contacts, properties, deals] = await Promise.all([
    prisma.contact.findMany({
      where: { isFavorite: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.property.findMany({
      where: { isFavorite: true },
      orderBy: { updatedAt: "desc" },
      include: { owner: true },
    }),
    prisma.deal.findMany({
      where: { isFavorite: true },
      orderBy: { updatedAt: "desc" },
      include: { contact: true, property: true },
    }),
  ]);

  return { contacts, properties, deals };
}

const typeColors: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-600",
  client: "bg-green-500/20 text-green-600",
  agent: "bg-purple-500/20 text-purple-600",
  vendor: "bg-amber-500/20 text-amber-600",
};

const statusColors: Record<string, string> = {
  available: "bg-green-500/20 text-green-600",
  under_contract: "bg-amber-500/20 text-amber-600",
  sold: "bg-blue-500/20 text-blue-600",
  off_market: "bg-neutral-500/20 text-neutral-600",
};

const stageColors: Record<string, string> = {
  new_lead: "bg-neutral-500/20 text-neutral-600",
  qualified: "bg-blue-500/20 text-blue-600",
  showing: "bg-amber-500/20 text-amber-600",
  offer: "bg-orange-500/20 text-orange-600",
  negotiation: "bg-purple-500/20 text-purple-600",
  closed: "bg-green-500/20 text-green-600",
};

export default async function FavoritesPage() {
  const { contacts, properties, deals } = await getFavorites();
  const totalCount = contacts.length + properties.length + deals.length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Favorites"
        description={`${totalCount} items saved to your favorites.`}
      />

      <div className="p-4 sm:p-6">
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="properties">
              Properties ({properties.length})
            </TabsTrigger>
            <TabsTrigger value="deals">
              Deals ({deals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {totalCount === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No favorites yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Star contacts, properties, or deals to quickly access them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {contacts.length > 0 && (
                  <FavoriteSection title="Contacts" icon={User}>
                    {contacts.map((contact) => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))}
                  </FavoriteSection>
                )}
                {properties.length > 0 && (
                  <FavoriteSection title="Properties" icon={Building2}>
                    {properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </FavoriteSection>
                )}
                {deals.length > 0 && (
                  <FavoriteSection title="Deals" icon={Target}>
                    {deals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </FavoriteSection>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="contacts">
            {contacts.length === 0 ? (
              <EmptyState type="contacts" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {contacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="properties">
            {properties.length === 0 ? (
              <EmptyState type="properties" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals">
            {deals.length === 0 ? (
              <EmptyState type="deals" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FavoriteSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          No favorite {type} yet. Star some to see them here!
        </p>
      </CardContent>
    </Card>
  );
}

interface FavoriteContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  isFavorite: boolean;
}

function ContactCard({ contact }: { contact: FavoriteContact }) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Link href={`/contacts/${contact.id}`} className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium hover:text-primary transition-colors">
                  {contact.name}
                </h3>
                <Badge
                  variant="secondary"
                  className={`text-xs capitalize ${typeColors[contact.type] || ""}`}
                >
                  {contact.type}
                </Badge>
              </div>
            </div>
          </Link>
          <FavoriteContactButton
            contactId={contact.id}
            isFavorite={contact.isFavorite}
          />
        </div>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{contact.phone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FavoriteProperty {
  id: string;
  address: string;
  city: string;
  state: string | null;
  price: number;
  status: string;
  isFavorite: boolean;
}

function PropertyCard({ property }: { property: FavoriteProperty }) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Link href={`/properties/${property.id}`} className="flex-1">
            <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
              {property.address}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {property.city}
                {property.state && `, ${property.state}`}
              </span>
            </div>
          </Link>
          <FavoritePropertyButton
            propertyId={property.id}
            isFavorite={property.isFavorite}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(property.price)}
          </span>
          <Badge
            variant="secondary"
            className={`capitalize ${statusColors[property.status] || ""}`}
          >
            {property.status.replace("_", " ")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface FavoriteDeal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  isFavorite: boolean;
  contact: { name: string } | null;
}

function DealCard({ deal }: { deal: FavoriteDeal }) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Link href={`/deals/${deal.id}`} className="flex-1">
            <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
              {deal.title}
            </h3>
            {deal.contact && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <User className="h-3.5 w-3.5" />
                <span>{deal.contact.name}</span>
              </div>
            )}
          </Link>
          <FavoriteDealButton
            dealId={deal.id}
            isFavorite={deal.isFavorite}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {deal.value ? (
            <span className="text-lg font-bold text-primary">
              {formatCurrency(deal.value)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No value set</span>
          )}
          <Badge
            variant="secondary"
            className={`capitalize ${stageColors[deal.stage] || ""}`}
          >
            {deal.stage.replace("_", " ")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

