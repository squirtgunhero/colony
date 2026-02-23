"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, ListTodo, FileText, PhoneCall } from "lucide-react";
import { createContact } from "@/app/(dashboard)/contacts/actions";
import { createTask } from "@/app/(dashboard)/tasks/actions";
import { createQuickNote, createQuickCall } from "./actions";

type Tab = "contact" | "task" | "note" | "call";

const TABS: { id: Tab; label: string; Icon: typeof UserPlus }[] = [
  { id: "contact", label: "Contact", Icon: UserPlus },
  { id: "task", label: "Task", Icon: ListTodo },
  { id: "note", label: "Note", Icon: FileText },
  { id: "call", label: "Log Call", Icon: PhoneCall },
];

interface QuickCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCaptureSheet({
  open,
  onOpenChange,
}: QuickCaptureSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contact");
  const [isPending, startTransition] = useTransition();

  const close = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg">Quick Capture</SheetTitle>
          <SheetDescription className="sr-only">
            Quickly add contacts, tasks, notes, or log calls
          </SheetDescription>
        </SheetHeader>

        {/* Tab Row */}
        <div className="flex gap-1 px-4 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="px-4 pb-6">
          {activeTab === "contact" && (
            <ContactForm
              isPending={isPending}
              startTransition={startTransition}
              onSuccess={close}
            />
          )}
          {activeTab === "task" && (
            <TaskForm
              isPending={isPending}
              startTransition={startTransition}
              onSuccess={close}
            />
          )}
          {activeTab === "note" && (
            <NoteForm
              isPending={isPending}
              startTransition={startTransition}
              onSuccess={close}
            />
          )}
          {activeTab === "call" && (
            <CallForm
              isPending={isPending}
              startTransition={startTransition}
              onSuccess={close}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface FormProps {
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onSuccess: () => void;
}

function ContactForm({ isPending, startTransition, onSuccess }: FormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createContact({
          name: name.trim(),
          phone: phone.trim() || undefined,
          type: "lead",
        });
        toast.success(`${name.trim()} added`);
        setName("");
        setPhone("");
        onSuccess();
      } catch {
        toast.error("Failed to add contact");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />
      <Input
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
      />
      <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
        {isPending ? "Adding..." : "Add Contact"}
      </Button>
    </form>
  );
}

function TaskForm({ isPending, startTransition, onSuccess }: FormProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await createTask({
          title: title.trim(),
          dueDate: dueDate || undefined,
          priority: "medium",
        });
        toast.success("Task created");
        setTitle("");
        setDueDate("");
        onSuccess();
      } catch {
        toast.error("Failed to create task");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="text-muted-foreground"
      />
      <Button type="submit" className="w-full" disabled={isPending || !title.trim()}>
        {isPending ? "Creating..." : "Add Task"}
      </Button>
    </form>
  );
}

function NoteForm({ isPending, startTransition, onSuccess }: FormProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      try {
        await createQuickNote({ text: text.trim() });
        toast.success("Note saved");
        setText("");
        onSuccess();
      } catch {
        toast.error("Failed to save note");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Write a quick note..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={3}
      />
      <Button type="submit" className="w-full" disabled={isPending || !text.trim()}>
        {isPending ? "Saving..." : "Save Note"}
      </Button>
    </form>
  );
}

function CallForm({ isPending, startTransition, onSuccess }: FormProps) {
  const [contactName, setContactName] = useState("");
  const [duration, setDuration] = useState("15");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    startTransition(async () => {
      try {
        await createQuickCall({
          contactName: contactName.trim(),
          durationMinutes: parseInt(duration),
          notes: notes.trim() || undefined,
        });
        toast.success("Call logged");
        setContactName("");
        setDuration("15");
        setNotes("");
        onSuccess();
      } catch {
        toast.error("Failed to log call");
      }
    });
  };

  const durations = [
    { label: "5 min", value: "5" },
    { label: "15 min", value: "15" },
    { label: "30 min", value: "30" },
    { label: "1 hr", value: "60" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Who did you call?"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        autoFocus
        required
      />
      <div className="flex gap-2">
        {durations.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDuration(d.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              duration === d.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !contactName.trim()}
      >
        {isPending ? "Logging..." : "Log Call"}
      </Button>
    </form>
  );
}
