"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
import { createProperty, updateProperty } from "@/app/(dashboard)/properties/actions";

const newContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  type: z.string().optional(),
});

const propertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  status: z.enum(["pre_listing", "listed", "under_contract", "sold", "off_market"]),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  newContact: newContactSchema.optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface Property {
  id: string;
  address: string;
  city: string;
  state: string | null;
  zipCode: string | null;
  price: number;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  description: string | null;
  owner: { id: string; name: string } | null;
}

interface Contact {
  id: string;
  name: string;
}

interface PropertyDialogProps {
  property?: Property;
  contacts: Contact[];
  children: React.ReactNode;
}

// Map old status values to new ones
function normalizeStatus(status: string | undefined): PropertyFormData["status"] {
  if (!status) return "listed";
  // Map old "available" to new "listed"
  if (status === "available") return "listed";
  // Validate it's a known status
  const validStatuses = ["pre_listing", "listed", "under_contract", "sold", "off_market"];
  if (validStatuses.includes(status)) {
    return status as PropertyFormData["status"];
  }
  return "listed";
}

export function PropertyDialog({
  property,
  contacts,
  children,
}: PropertyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewContactFields, setShowNewContactFields] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      address: property?.address || "",
      city: property?.city || "",
      state: property?.state || "",
      zipCode: property?.zipCode || "",
      price: property?.price || 0,
      status: normalizeStatus(property?.status),
      bedrooms: property?.bedrooms || undefined,
      bathrooms: property?.bathrooms || undefined,
      sqft: property?.sqft || undefined,
      description: property?.description || "",
      ownerId: property?.owner?.id || "",
      newContact: undefined,
    },
  });

  const status = watch("status");
  const ownerId = watch("ownerId");
  const newContactType = watch("newContact.type");
  
  const handleOwnerChange = (value: string) => {
    if (value === "new") {
      setShowNewContactFields(true);
      setValue("ownerId", "");
    } else {
      setShowNewContactFields(false);
      setValue("ownerId", value === "none" ? "" : value);
      setValue("newContact", undefined);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    setIsLoading(true);
    try {
      if (property) {
        await updateProperty(property.id, data);
        toast.success("Property updated", {
          description: `${data.address} has been updated successfully.`,
        });
      } else {
        await createProperty(data);
        toast.success("Property created", {
          description: `${data.address} has been added to your listings.`,
        });
      }
      setOpen(false);
      setShowNewContactFields(false);
      reset();
    } catch (error) {
      console.error("Failed to save property:", error);
      toast.error("Failed to save property", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) setShowNewContactFields(false);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {property ? "Edit Property" : "Add New Property"}
          </DialogTitle>
          <DialogDescription>
            {property
              ? "Update the property details below."
              : "Fill in the details to add a new property listing."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="123 Main Street"
              />
              {errors.address && (
                <p className="text-sm text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="Los Angeles"
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} placeholder="CA" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                {...register("zipCode")}
                placeholder="90210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                {...register("price", { valueAsNumber: true })}
                placeholder="500000"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue("status", value as PropertyFormData["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_listing">Pre-Listing</SelectItem>
                  <SelectItem value="listed">Listed</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="off_market">Off Market</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerId">Owner</Label>
              <Select
                value={showNewContactFields ? "new" : (ownerId || "none")}
                onValueChange={handleOwnerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No owner</SelectItem>
                  <SelectItem value="new">
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add new contact
                    </span>
                  </SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* New Contact Fields */}
            {showNewContactFields && (
              <div className="col-span-2 rounded-lg border border-border p-4 space-y-4 bg-muted/30">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  New contact details
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newContact.name">Name *</Label>
                    <Input
                      id="newContact.name"
                      {...register("newContact.name")}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newContact.type">Type</Label>
                    <Select
                      value={newContactType || "client"}
                      onValueChange={(value) => setValue("newContact.type", value)}
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newContact.email">Email</Label>
                    <Input
                      id="newContact.email"
                      type="email"
                      {...register("newContact.email")}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newContact.phone">Phone</Label>
                    <Input
                      id="newContact.phone"
                      {...register("newContact.phone")}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                {...register("bedrooms", { valueAsNumber: true })}
                placeholder="3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                {...register("bathrooms", { valueAsNumber: true })}
                placeholder="2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sqft">Square Feet</Label>
              <Input
                id="sqft"
                type="text"
                inputMode="numeric"
                {...register("sqft", { 
                  setValueAs: (v) => v === "" ? undefined : parseInt(v.replace(/,/g, ""), 10) || undefined
                })}
                placeholder="1,500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Property description..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : property ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

