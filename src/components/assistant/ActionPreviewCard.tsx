"use client";

// ============================================
// COLONY ASSISTANT - Action Preview Card
// Preview mutations before applying
// ============================================

import { useState } from "react";
import {
  UserPlus,
  UserCog,
  CheckSquare,
  FileText,
  Mail,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Action } from "@/lib/assistant/types";
import { executeAction, getActionDescription } from "@/lib/assistant/actions";

interface ActionPreviewCardProps {
  action: Action;
  status: "pending" | "applied" | "cancelled";
  onApply: () => void;
  onCancel: () => void;
}

const iconMap: Record<string, typeof UserPlus> = {
  create_lead: UserPlus,
  update_lead: UserCog,
  create_task: CheckSquare,
  log_note: FileText,
  draft_email: Mail,
};

export function ActionPreviewCard({
  action,
  status,
  onApply,
  onCancel,
}: ActionPreviewCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const Icon = iconMap[action.kind] || CheckSquare;
  const description = getActionDescription(action);

  const handleApply = async () => {
    setIsExecuting(true);
    try {
      const res = await executeAction(action);
      setResult(res.message);
      onApply();
    } catch (error) {
      setResult("Failed to execute action");
    } finally {
      setIsExecuting(false);
    }
  };

  // Render payload details
  const renderPayload = () => {
    switch (action.kind) {
      case "create_lead":
        return (
          <div className="space-y-1 text-xs">
            <div><span className="text-muted-foreground">Name:</span> {action.payload.name}</div>
            {action.payload.email && (
              <div><span className="text-muted-foreground">Email:</span> {action.payload.email}</div>
            )}
            {action.payload.source && (
              <div><span className="text-muted-foreground">Source:</span> {action.payload.source}</div>
            )}
          </div>
        );

      case "create_task":
        return (
          <div className="space-y-1 text-xs">
            <div><span className="text-muted-foreground">Task:</span> {action.payload.title}</div>
            {action.payload.priority && (
              <div><span className="text-muted-foreground">Priority:</span> {action.payload.priority}</div>
            )}
            {action.payload.dueAt && (
              <div><span className="text-muted-foreground">Due:</span> {action.payload.dueAt}</div>
            )}
          </div>
        );

      case "log_note":
        return (
          <div className="text-xs">
            <span className="text-muted-foreground">Note:</span> {action.payload.note}
          </div>
        );

      case "draft_email":
        return (
          <div className="space-y-1 text-xs">
            <div><span className="text-muted-foreground">Subject:</span> {action.payload.subject}</div>
            <div className="text-muted-foreground line-clamp-2">{action.payload.body}</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]",
        "bg-card shadow-sm",
        status === "applied" && "border-[#3d7a4a]/30 bg-[rgba(61,122,74,0.04)]",
        status === "cancelled" && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            status === "applied"
              ? "bg-[rgba(61,122,74,0.1)] text-[#3d7a4a]"
              : "bg-primary/10 text-primary"
          )}
        >
          {status === "applied" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{description}</div>
          <div className="text-[11px] text-muted-foreground">
            {status === "pending" && "Review and confirm"}
            {status === "applied" && (result || "Applied successfully")}
            {status === "cancelled" && "Cancelled"}
          </div>
        </div>
      </div>

      {/* Payload */}
      <div className="p-3 bg-muted/30">
        {renderPayload()}
      </div>

      {/* Actions */}
      {status === "pending" && (
        <div className="flex items-center gap-2 p-3 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
          <Button
            size="sm"
            className="flex-1 h-8"
            onClick={handleApply}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Apply
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={onCancel}
            disabled={isExecuting}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

