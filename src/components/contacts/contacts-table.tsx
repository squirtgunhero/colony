"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactDialog } from "./contact-dialog";
import { SendEmailDialog } from "@/components/email/send-email-dialog";
import { deleteContact } from "@/app/(dashboard)/contacts/actions";
import { MoreHorizontal, Pencil, Trash2, Search, Mail, Phone, Send } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { FavoriteContactButton } from "@/components/favorites/favorite-contact-button";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  tags: string[];
  source: string | null;
  notes: string | null;
  isFavorite: boolean;
  createdAt: Date;
  _count: {
    properties: number;
    deals: number;
    tasks: number;
  };
}

const tagColors: Record<string, string> = {
  buyer: "bg-emerald-500/20 text-emerald-500",
  seller: "bg-amber-500/20 text-amber-500",
  renter: "bg-sky-500/20 text-sky-500",
};

const sourceLabels: Record<string, string> = {
  zillow: "Zillow",
  website: "Website",
  referral: "Referral",
  social: "Social",
  cold_call: "Cold Call",
  open_house: "Open House",
  other: "Other",
};

interface ContactsTableProps {
  contacts: Contact[];
}

const typeColors: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-400",
  client: "bg-green-500/20 text-green-400",
  agent: "bg-purple-500/20 text-purple-400",
  vendor: "bg-orange-500/20 text-orange-400",
};

export function ContactsTable({ contacts }: ContactsTableProps) {
  const [search, setSearch] = useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Deals</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <p className="text-muted-foreground">No contacts found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <FavoriteContactButton
                      contactId={contact.id}
                      isFavorite={contact.isFavorite}
                    />
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/contacts/${contact.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`capitalize ${typeColors[contact.type] || ""}`}
                    >
                      {contact.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.tags && contact.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className={`capitalize text-xs ${tagColors[tag] || ""}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.source ? (
                      <span className="text-sm text-muted-foreground">
                        {sourceLabels[contact.source] || contact.source}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>{contact._count.properties}</TableCell>
                  <TableCell>{contact._count.deals}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(contact.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ContactDialog contact={contact}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </ContactDialog>
                        {contact.email && (
                          <SendEmailDialog
                            contactId={contact.id}
                            contactName={contact.name}
                            contactEmail={contact.email}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                          </SendEmailDialog>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            await deleteContact(contact.id);
                            toast.success("Contact deleted", {
                              description: `${contact.name} has been removed.`,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

