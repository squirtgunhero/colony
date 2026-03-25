import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ListingAlertsDashboard } from "./listing-alerts-dashboard";

export default async function ListingAlertsPage() {
  const userId = await requireUserId();

  const [alerts, contacts, propertyStats] = await Promise.all([
    prisma.listingAlert.findMany({
      where: { userId },
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { userId },
      select: { id: true, name: true, email: true, phone: true, type: true },
      orderBy: { name: "asc" },
    }),
    (async () => {
      const [cities, totalListed] = await Promise.all([
        prisma.property.groupBy({
          by: ["city"],
          where: { userId },
          _count: true,
          orderBy: { _count: { city: "desc" } },
        }),
        prisma.property.count({ where: { userId, status: "listed" } }),
      ]);
      return {
        cities: cities.map((c) => c.city),
        totalListed,
      };
    })(),
  ]);

  const serialized = JSON.parse(JSON.stringify(alerts));
  return (
    <ListingAlertsDashboard
      alerts={serialized}
      contacts={contacts}
      availableCities={propertyStats.cities}
      totalListed={propertyStats.totalListed}
    />
  );
}
