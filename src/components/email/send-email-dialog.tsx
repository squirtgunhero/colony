"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendEmail, getUserEmailAccounts } from "@/app/(dashboard)/email/actions";
import { emailTemplates, fillTemplate, type EmailTemplate } from "@/lib/email-templates";
import { Mail, Send, Loader2, FileText, Settings, AlertCircle, LayoutTemplate } from "lucide-react";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message is required"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  isDefault: boolean;
}

interface SendEmailDialogProps {
  contactId: string;
  contactName: string;
  contactEmail: string;
  children: React.ReactNode;
}

// Group templates by category
const templateGroups: { label: string; category: EmailTemplate["category"] }[] = [
  { label: "Follow-Up", category: "follow-up" },
  { label: "Listings", category: "listing" },
  { label: "Meetings", category: "meeting" },
  { label: "General", category: "general" },
];

export function SendEmailDialog({ 
  contactId, 
  contactName, 
  contactEmail,
  children 
}: SendEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: "",
      body: "",
    },
  });

  const currentBody = watch("body");
  const currentSubject = watch("subject");

  // Load email accounts when dialog opens
  useEffect(() => {
    if (open) {
      loadEmailAccounts();
    }
  }, [open]);

  const loadEmailAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const accounts = await getUserEmailAccounts();
      setEmailAccounts(accounts);
      // Select default account
      const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    } catch (error) {
      console.error("Failed to load email accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      const variables = { contactName };
      setValue("subject", fillTemplate(template.subject, variables));
      setValue("body", fillTemplate(template.body, variables));
    }
  };

  const onSubmit = async (data: EmailFormData) => {
    if (!selectedAccountId) {
      setResult({ success: false, message: "Please connect an email account in Settings" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await sendEmail({
        to: contactEmail,
        subject: data.subject,
        body: data.body,
        contactId,
        emailAccountId: selectedAccountId,
      });

      if (response.success) {
        setResult({ success: true, message: "Email sent successfully!" });
        setTimeout(() => {
          setOpen(false);
          reset({ subject: "", body: "" });
          setSelectedTemplate("");
          setResult(null);
        }, 1500);
      } else {
        setResult({ success: false, message: response.error || "Failed to send email" });
      }
    } catch {
      setResult({ success: false, message: "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset({ subject: "", body: "" });
      setSelectedTemplate("");
      setResult(null);
    }
  };

  const selectedAccount = emailAccounts.find((a) => a.id === selectedAccountId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email to <span className="font-medium text-foreground">{contactName}</span> ({contactEmail})
          </DialogDescription>
        </DialogHeader>

        {/* No accounts connected warning */}
        {!loadingAccounts && emailAccounts.length === 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">No email account connected</p>
                <p className="text-xs text-muted-foreground">
                  Connect your Gmail account in Settings to send emails.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* From Account Selector */}
        {emailAccounts.length > 0 && (
          <div className="space-y-2 pt-2">
            <Label>From</Label>
            {emailAccounts.length === 1 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium">{selectedAccount?.email}</span>
              </div>
            ) : (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender account" />
                </SelectTrigger>
                <SelectContent>
                  {emailAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.email}</span>
                        {account.isDefault && (
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Template Selector */}
        <div className="space-y-2 pt-2">
          <Label className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-amber-500" />
            Use a Template
          </Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a template to get started..." />
            </SelectTrigger>
            <SelectContent>
              {templateGroups.map((group) => {
                const templates = emailTemplates.filter((t) => t.category === group.category);
                return (
                  <SelectGroup key={group.category}>
                    <SelectLabel className="text-xs uppercase text-muted-foreground tracking-wide">
                      {group.label}
                    </SelectLabel>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              {...register("subject")}
              placeholder="Enter email subject..."
              className={currentSubject ? "" : "text-muted-foreground"}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message *</Label>
              <span className="text-xs text-muted-foreground">
                {currentBody.length} characters
              </span>
            </div>
            <Textarea
              id="body"
              {...register("body")}
              placeholder="Write your message here..."
              rows={12}
              className="font-sans resize-none"
            />
            {errors.body && (
              <p className="text-sm text-destructive">{errors.body.message}</p>
            )}
          </div>

          {/* Template Variables Help */}
          {selectedTemplate && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Template variables:</p>
              <p>Use <code className="bg-muted px-1 rounded">{"{{contactName}}"}</code> to insert the contact&apos;s name</p>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              result.success 
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                : "bg-red-500/10 text-red-600 border border-red-500/20"
            }`}>
              {result.success ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {result.message}
            </div>
          )}

          <div className="flex justify-between items-center gap-3 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {selectedAccount 
                ? `Sending from ${selectedAccount.email}`
                : "Connect Gmail in Settings to send emails"}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || emailAccounts.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
