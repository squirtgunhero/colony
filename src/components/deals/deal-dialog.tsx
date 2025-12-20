"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { createDeal, updateDeal } from "@/app/(dashboard)/deals/actions";

const dealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  stage: z.enum([
    "new_lead",
    "qualified",
    "showing",
    "offer",
    "negotiation",
    "closed",
  ]),
  value: z.number().optional(),
  notes: z.string().optional(),
  contactId: z.string().optional(),
  propertyId: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  notes: string | null;
  contact: { id: string; name: string } | null;
  property: { id: string; address: string; city: string } | null;
}

interface Contact {
  id: string;
  name: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
}

interface DealDialogProps {
  deal?: Deal;
  contacts: Contact[];
  properties: Property[];
  children: React.ReactNode;
}

export function DealDialog({
  deal,
  contacts,
  properties,
  children,
}: DealDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: deal?.title || "",
      stage: (deal?.stage as DealFormData["stage"]) || "new_lead",
      value: deal?.value || undefined,
      notes: deal?.notes || "",
      contactId: deal?.contact?.id || "",
      propertyId: deal?.property?.id || "",
    },
  });

  const stage = watch("stage");
  const contactId = watch("contactId");
  const propertyId = watch("propertyId");

  const onSubmit = async (data: DealFormData) => {
    setIsLoading(true);
    try {
      if (deal) {
        await updateDeal(deal.id, data);
        toast.success("Deal updated", {
          description: `${data.title} has been updated successfully.`,
        });
      } else {
        await createDeal(data);
        toast.success("Deal created", {
          description: `${data.title} has been added to your pipeline.`,
        });
      }
      setOpen(false);
      reset();
    } catch (error) {
      console.error("Failed to save deal:", error);
      toast.error("Failed to save deal", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
          <DialogDescription>
            {deal
              ? "Update the deal information below."
              : "Fill in the details to create a new deal."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="New home sale"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={stage}
                onValueChange={(value) =>
                  setValue("stage", value as DealFormData["stage"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_lead">New Contact</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="showing">Showing</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Deal Value</Label>
              <Input
                id="value"
                type="number"
                {...register("value", { valueAsNumber: true })}
                placeholder="500000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactId">Contact</Label>
            <Select
              value={contactId || "none"}
              onValueChange={(value) =>
                setValue("contactId", value === "none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyId">Property</Label>
            <Select
              value={propertyId || "none"}
              onValueChange={(value) =>
                setValue("propertyId", value === "none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No property</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}, {property.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add notes about this deal..."
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
              {isLoading ? "Saving..." : deal ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

