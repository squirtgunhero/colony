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
import { createActivity, ActivityType } from "@/app/(dashboard)/activities/actions";
import { Phone, Mail, Users, FileText } from "lucide-react";

const activitySchema = z.object({
  type: z.enum(["call", "email", "meeting", "note"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

type DialogActivityType = "call" | "email" | "meeting" | "note";

interface ActivityDialogProps {
  contactId: string;
  contactName: string;
  defaultType?: DialogActivityType;
  children: React.ReactNode;
}

const activityTypes = [
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "note", label: "Note", icon: FileText },
] as const;

export function ActivityDialog({ 
  contactId, 
  contactName, 
  defaultType = "note",
  children 
}: ActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: defaultType,
      title: "",
      description: "",
    },
  });

  const type = watch("type");

  const onSubmit = async (data: ActivityFormData) => {
    setIsLoading(true);
    try {
      await createActivity({
        type: data.type as ActivityType,
        title: data.title,
        description: data.description,
        contactId,
      });
      toast.success("Activity logged", {
        description: `${data.title} has been recorded.`,
      });
      setOpen(false);
      reset();
    } catch (error) {
      console.error("Failed to create activity:", error);
      toast.error("Failed to log activity", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case "call":
        return "Discussed property requirements...";
      case "email":
        return "Sent listing information...";
      case "meeting":
        return "Met at the property for showing...";
      default:
        return "Add any notes...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>
            Record an interaction with {contactName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="type">Activity Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setValue("type", value as ActivityFormData["type"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((actType) => (
                  <SelectItem key={actType.value} value={actType.value}>
                    <div className="flex items-center gap-2">
                      <actType.icon className="h-4 w-4" />
                      {actType.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder={
                type === "call" ? "Call with client" :
                type === "email" ? "Sent property listings" :
                type === "meeting" ? "Property showing" :
                "Quick note"
              }
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder={getPlaceholder()}
              rows={4}
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
              {isLoading ? "Saving..." : "Log Activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

