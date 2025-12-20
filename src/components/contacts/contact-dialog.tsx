"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createContact, updateContact } from "@/app/(dashboard)/contacts/actions";

const LEAD_SOURCES = [
  { value: "zillow", label: "Zillow" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social Media" },
  { value: "cold_call", label: "Cold Call" },
  { value: "open_house", label: "Open House" },
  { value: "other", label: "Other" },
] as const;

const CONTACT_TAGS = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "renter", label: "Renter" },
] as const;

const propertySchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  price: z.number().optional(),
  status: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
});

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  type: z.enum(["lead", "client", "agent", "vendor"]),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  property: propertySchema.optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  tags: string[];
  source: string | null;
  notes: string | null;
}

interface ContactDialogProps {
  contact?: Contact;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function ContactDialog({ contact, children, onOpenChange }: ContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [showPropertyFields, setShowPropertyFields] = useState(false);
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setShowPropertyFields(false);
    }
  };
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      type: (contact?.type as ContactFormData["type"]) || "lead",
      tags: contact?.tags || [],
      source: contact?.source || "",
      notes: contact?.notes || "",
      property: undefined,
    },
  });

  const type = watch("type");
  const tags = watch("tags") || [];
  const source = watch("source");
  const propertyStatus = watch("property.status");

  const toggleTag = (tag: string) => {
    const currentTags = tags || [];
    if (currentTags.includes(tag)) {
      setValue("tags", currentTags.filter((t) => t !== tag));
    } else {
      setValue("tags", [...currentTags, tag]);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      if (contact) {
        await updateContact(contact.id, data);
        toast.success("Contact updated", {
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await createContact(data);
        toast.success("Contact created", {
          description: `${data.name} has been added to your contacts.`,
        });
      }
      setOpen(false);
      setShowPropertyFields(false);
      reset();
    } catch (error) {
      console.error("Failed to save contact:", error);
      toast.error("Failed to save contact", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? "Update the contact information below."
              : "Fill in the details to add a new contact."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setValue("type", value as ContactFormData["type"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Contact Source</Label>
              <Select
                value={source || ""}
                onValueChange={(value) => setValue("source", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((src) => (
                    <SelectItem key={src.value} value={src.value}>
                      {src.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    tags.includes(tag.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>

          {/* Property Section - Only for new contacts */}
          {!contact && (
            <Collapsible open={showPropertyFields} onOpenChange={setShowPropertyFields}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Add a Property
                  </span>
                  {showPropertyFields ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Add a property that will be linked to this contact
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="property.address">Address *</Label>
                    <Input
                      id="property.address"
                      {...register("property.address")}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property.city">City *</Label>
                      <Input
                        id="property.city"
                        {...register("property.city")}
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property.state">State</Label>
                      <Input
                        id="property.state"
                        {...register("property.state")}
                        placeholder="CA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property.zipCode">Zip Code</Label>
                      <Input
                        id="property.zipCode"
                        {...register("property.zipCode")}
                        placeholder="90210"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property.price">Price</Label>
                      <Input
                        id="property.price"
                        type="number"
                        {...register("property.price", { valueAsNumber: true })}
                        placeholder="500000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property.status">Status</Label>
                      <Select
                        value={propertyStatus || "available"}
                        onValueChange={(value) => setValue("property.status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="under_contract">Under Contract</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="off_market">Off Market</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property.sqft">Square Feet</Label>
                      <Input
                        id="property.sqft"
                        type="number"
                        {...register("property.sqft", { valueAsNumber: true })}
                        placeholder="1500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property.bedrooms">Bedrooms</Label>
                      <Input
                        id="property.bedrooms"
                        type="number"
                        {...register("property.bedrooms", { valueAsNumber: true })}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property.bathrooms">Bathrooms</Label>
                      <Input
                        id="property.bathrooms"
                        type="number"
                        step="0.5"
                        {...register("property.bathrooms", { valueAsNumber: true })}
                        placeholder="2"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : contact ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

