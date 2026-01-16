"use client";

// ============================================
// COLONY - Contact Panel for Context Drawer
// Shows contact details in drawer format
// ============================================

import { useEffect, useState } from "react";
import { User, Mail, Phone, MapPin, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  source?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deals?: Array<{ id: string; title: string; stage: string }>;
  tasks?: Array<{ id: string; title: string; dueDate: string; completed: boolean }>;
}

interface ContactPanelProps {
  entityId?: string;
}

export function ContactPanel({ entityId }: ContactPanelProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    async function fetchContact() {
      try {
        const res = await fetch(`/api/contacts/${entityId}`);
        if (res.ok) {
          const json = await res.json();
          setContact(json);
        }
      } catch (error) {
        console.error("Failed to fetch contact:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContact();
  }, [entityId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-muted animate-pulse rounded-full" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <User className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p>Contact not found</p>
      </div>
    );
  }

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary text-xl font-semibold">
          {initials}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{contact.name}</h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full capitalize",
              contact.type === "lead" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              contact.type === "client" && "bg-green-500/10 text-green-600 dark:text-green-400",
              contact.type === "prospect" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {contact.type}
            </span>
            {contact.source && (
              <span className="text-xs text-muted-foreground">via {contact.source}</span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        {contact.email && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.company && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{contact.company}</span>
          </div>
        )}
        {contact.address && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{contact.address}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </h4>
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Related Deals */}
      {contact.deals && contact.deals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Deals ({contact.deals.length})
          </h4>
          <div className="space-y-2">
            {contact.deals.map((deal) => (
              <div 
                key={deal.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <span className="text-sm font-medium truncate">{deal.title}</span>
                <span className="text-xs text-muted-foreground">{deal.stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/50">
        <Calendar className="h-3.5 w-3.5" />
        <span>Added {formatDate(new Date(contact.createdAt))}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1">
          Edit
        </Button>
        <Button size="sm" className="flex-1">
          Create Deal
        </Button>
      </div>
    </div>
  );
}
