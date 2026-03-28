"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Zap,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Sparkles,
  Mail,
  CheckSquare,
  Tag,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  type: "action" | "condition" | "delay" | "ai";
  actionType?: string;
  params?: Record<string, unknown>;
  field?: string;
  operator?: string;
  value?: unknown;
  thenStep?: string;
  elseStep?: string;
  delayMinutes?: number;
}

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: { type: string; entityType?: string; conditions?: Record<string, unknown> };
  steps: WorkflowStep[];
  status: string;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  _count: { runs: number };
  runs: WorkflowRun[];
}

const triggerLabels: Record<string, string> = {
  "record.created": "Record created",
  "record.updated": "Record updated",
  "record.deleted": "Record deleted",
  "score.changed": "Score changed",
  "enrichment.completed": "Enrichment completed",
  "ai.computed": "AI computed",
  "deal.stage_changed": "Deal stage changed",
  "task.completed": "Task completed",
  "email.opened": "Email opened",
  "email.clicked": "Email clicked",
};

const stepIcons: Record<string, typeof Mail> = {
  send_email: Mail,
  create_task: CheckSquare,
  add_tag: Tag,
  send_sms: MessageSquare,
  enrich_contact: Sparkles,
};

export default function WorkflowsSettingsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch {
      console.error("Failed to fetch workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  async function toggleStatus(workflow: Workflow) {
    const newStatus = workflow.status === "active" ? "paused" : "active";
    await fetch("/api/workflows", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: workflow.id, status: newStatus }),
    });
    fetchWorkflows();
  }

  async function handleDelete(workflow: Workflow) {
    if (!confirm(`Delete "${workflow.name}"? All run history will be lost.`)) return;
    await fetch("/api/workflows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: workflow.id }),
    });
    fetchWorkflows();
  }

  return (
    <div className="min-h-screen">
      <div className="border-b">
        <div className="p-4 sm:p-6">
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Zap className="h-6 w-6" />
                Workflows
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Multi-step automations triggered by CRM events. Create workflows by chatting with Tara.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-4xl space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No workflows yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create workflows by chatting with Tara. Try: &ldquo;When a new lead comes in, wait 1 day, then send a welcome email&rdquo;
              </p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => {
            const isExpanded = expandedId === workflow.id;
            const steps = (workflow.steps || []) as WorkflowStep[];
            const statusColors: Record<string, string> = {
              active: "text-green-600 bg-green-500/10",
              paused: "text-amber-600 bg-amber-500/10",
              draft: "text-slate-500 bg-slate-500/10",
            };

            return (
              <Card key={workflow.id}>
                <CardContent className="py-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <button
                      className="flex items-start gap-2 text-left flex-1 min-w-0"
                      onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-medium text-sm">{workflow.name}</h3>
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${statusColors[workflow.status] || statusColors.draft}`}>
                            {workflow.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {steps.length} step{steps.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {triggerLabels[workflow.trigger?.type] || workflow.trigger?.type}
                          {workflow.trigger?.entityType && ` (${workflow.trigger.entityType})`}
                          {" · "}
                          {workflow.runCount} run{workflow.runCount !== 1 ? "s" : ""}
                          {workflow.lastRunAt && ` · Last: ${new Date(workflow.lastRunAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleStatus(workflow)}
                        title={workflow.status === "active" ? "Pause" : "Resume"}
                      >
                        {workflow.status === "active" ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(workflow)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: Step viewer */}
                  {isExpanded && (
                    <div className="mt-4 pl-6 border-l-2 border-muted ml-2 space-y-3">
                      {/* Trigger */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Zap className="h-3 w-3 text-primary" />
                        </div>
                        <span className="font-medium">Trigger:</span>
                        <span className="text-muted-foreground">
                          {triggerLabels[workflow.trigger?.type] || workflow.trigger?.type}
                          {workflow.trigger?.entityType && ` → ${workflow.trigger.entityType}`}
                          {workflow.trigger?.conditions && (
                            <> where {Object.entries(workflow.trigger.conditions).map(([k, v]) => `${k} = ${v}`).join(", ")}</>
                          )}
                        </span>
                      </div>

                      {/* Steps */}
                      {steps.map((step, i) => (
                        <div key={step.id} className="flex items-start gap-2 text-xs">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <StepIcon step={step} />
                          </div>
                          <div className="pt-0.5">
                            <span className="font-medium text-muted-foreground mr-1">{i + 1}.</span>
                            <StepLabel step={step} />
                          </div>
                        </div>
                      ))}

                      {/* Recent runs */}
                      {workflow.runs && workflow.runs.length > 0 && (
                        <div className="pt-2 border-t border-muted mt-3">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Recent Runs
                          </p>
                          {workflow.runs.map((run) => {
                            const runStatusColors: Record<string, string> = {
                              completed: "text-green-600",
                              failed: "text-red-500",
                              running: "text-blue-500",
                              delayed: "text-amber-500",
                              cancelled: "text-slate-400",
                            };
                            return (
                              <div key={run.id} className="flex items-center gap-2 text-[11px] py-0.5">
                                <span className={`font-medium ${runStatusColors[run.status] || ""}`}>
                                  {run.status}
                                </span>
                                <span className="text-muted-foreground">
                                  {new Date(run.startedAt).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function StepIcon({ step }: { step: WorkflowStep }) {
  if (step.type === "delay") return <Clock className="h-3 w-3 text-muted-foreground" />;
  if (step.type === "condition") return <GitBranch className="h-3 w-3 text-muted-foreground" />;
  if (step.type === "ai") return <Sparkles className="h-3 w-3 text-muted-foreground" />;

  const Icon = stepIcons[step.actionType || ""] || ArrowRight;
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

function StepLabel({ step }: { step: WorkflowStep }) {
  if (step.type === "delay") {
    const mins = step.delayMinutes || 0;
    if (mins >= 1440) return <span>Wait {Math.round(mins / 1440)} day(s)</span>;
    if (mins >= 60) return <span>Wait {Math.round(mins / 60)} hour(s)</span>;
    return <span>Wait {mins} minute(s)</span>;
  }

  if (step.type === "condition") {
    return <span>If {step.field} {step.operator} {String(step.value)}</span>;
  }

  if (step.type === "ai") {
    return <span>Run AI attribute computation</span>;
  }

  const actionLabels: Record<string, string> = {
    send_email: "Send email",
    create_task: "Create task",
    update_deal_stage: "Update deal stage",
    send_sms: "Send SMS",
    add_tag: "Add tag",
    enrich_contact: "Enrich contact",
  };

  const label = actionLabels[step.actionType || ""] || step.actionType || "Action";
  const detail = step.params
    ? Object.entries(step.params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: "${v}"`)
        .join(", ")
    : "";

  return (
    <span>
      {label}
      {detail && <span className="text-muted-foreground ml-1">({detail})</span>}
    </span>
  );
}
