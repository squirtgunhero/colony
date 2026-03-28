"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold">
            Quick Capture
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quickly add contacts, tasks, notes, or log calls
          </DialogDescription>
        </DialogHeader>

        {/* Tab Row */}
        <div className="flex gap-1 px-6 pb-4 border-b border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="px-6 py-5">
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
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onSuccess: () => void;
}

function ContactForm({ isPending, startTransition, onSuccess }: FormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createContact({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          type: "lead",
        });
        toast.success(`${name.trim()} added`);
        setName("");
        setEmail("");
        setPhone("");
        onSuccess();
      } catch {
        toast.error("Failed to add contact");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-phone">Phone</Label>
        <Input
          id="contact-phone"
          placeholder="(555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={isPending || !name.trim()}
      >
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-due">Due Date</Label>
        <Input
          id="task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={isPending || !title.trim()}
      >
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="note-text">Note</Label>
        <Textarea
          id="note-text"
          placeholder="Write a quick note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          rows={4}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={isPending || !text.trim()}
      >
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
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "30m", value: "30" },
    { label: "1h", value: "60" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="call-contact">Contact</Label>
        <Input
          id="call-contact"
          placeholder="Who did you call?"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Duration</Label>
        <div className="flex gap-2">
          {durations.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                duration === d.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="call-notes">Notes</Label>
        <Textarea
          id="call-notes"
          placeholder="Call notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={isPending || !contactName.trim()}
      >
        {isPending ? "Logging..." : "Log Call"}
      </Button>
    </form>
  );
}
