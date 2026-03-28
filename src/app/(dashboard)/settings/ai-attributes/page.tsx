"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Trash2,
  Pencil,
  X,
  Save,
  Wand2,
} from "lucide-react";

interface AiAttribute {
  id: string;
  name: string;
  slug: string;
  entityType: string;
  outputType: string;
  options: string[] | null;
  prompt: string;
  contextFields: string[];
  autoRun: boolean;
  isPreset: boolean;
  createdAt: string;
}

export default function AiAttributesSettingsPage() {
  const router = useRouter();
  const [attributes, setAttributes] = useState<AiAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEntityType, setFormEntityType] = useState("contact");
  const [formOutputType, setFormOutputType] = useState("text");
  const [formOptions, setFormOptions] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formAutoRun, setFormAutoRun] = useState(false);

  const fetchAttributes = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-attributes");
      const data = await res.json();
      setAttributes(data.attributes || []);
    } catch {
      console.error("Failed to fetch AI attributes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  function resetForm() {
    setFormName("");
    setFormEntityType("contact");
    setFormOutputType("text");
    setFormOptions("");
    setFormPrompt("");
    setFormAutoRun(false);
    setEditingId(null);
    setShowCreate(false);
  }

  function startEdit(attr: AiAttribute) {
    setEditingId(attr.id);
    setFormName(attr.name);
    setFormEntityType(attr.entityType);
    setFormOutputType(attr.outputType);
    setFormOptions(attr.options?.join(", ") || "");
    setFormPrompt(attr.prompt);
    setFormAutoRun(attr.autoRun);
    setShowCreate(true);
  }

  async function handleSave() {
    const body: Record<string, unknown> = {
      name: formName,
      entityType: formEntityType,
      outputType: formOutputType,
      prompt: formPrompt,
      autoRun: formAutoRun,
    };

    if (formOutputType === "select" && formOptions) {
      body.options = formOptions.split(",").map((o) => o.trim()).filter(Boolean);
    }

    try {
      if (editingId) {
        body.id = editingId;
        await fetch("/api/ai-attributes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/ai-attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      fetchAttributes();
    } catch {
      console.error("Failed to save attribute");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this AI attribute? All computed values will be lost.")) return;
    try {
      await fetch("/api/ai-attributes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchAttributes();
    } catch {
      console.error("Failed to delete attribute");
    }
  }

  async function handleSeedPresets() {
    setSeeding(true);
    try {
      await fetch("/api/ai-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      fetchAttributes();
    } catch {
      console.error("Failed to seed presets");
    } finally {
      setSeeding(false);
    }
  }

  const outputTypeLabels: Record<string, string> = {
    select: "Select",
    number: "Number",
    text: "Text",
    boolean: "Yes/No",
  };

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
                <Sparkles className="h-6 w-6" />
                AI Attributes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Define AI-powered fields that automatically analyze and classify your CRM records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {attributes.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeedPresets} disabled={seeding}>
                  <Wand2 className="h-4 w-4 mr-1.5" />
                  {seeding ? "Setting up..." : "Add Presets"}
                </Button>
              )}
              <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Attribute
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-4xl space-y-4">
        {/* Create / Edit form */}
        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingId ? "Edit Attribute" : "Create AI Attribute"}
              </CardTitle>
              <CardDescription>
                Define what AI should compute for each record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Lead Quality"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formEntityType}
                    onChange={(e) => setFormEntityType(e.target.value)}
                  >
                    <option value="contact">Contact</option>
                    <option value="deal">Deal</option>
                    <option value="property">Property</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Output Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formOutputType}
                    onChange={(e) => setFormOutputType(e.target.value)}
                  >
                    <option value="text">Text</option>
                    <option value="select">Select (pick one)</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes / No</option>
                  </select>
                </div>
                {formOutputType === "select" && (
                  <div className="space-y-2">
                    <Label>Options (comma-separated)</Label>
                    <Input
                      placeholder="Hot, Warm, Cold"
                      value={formOptions}
                      onChange={(e) => setFormOptions(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>AI Prompt</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs resize-y"
                  placeholder="Evaluate this contact's lead quality based on their engagement..."
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formAutoRun}
                  onCheckedChange={setFormAutoRun}
                />
                <Label>Auto-run on record creation/update</Label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={!formName || !formPrompt}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attribute list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : attributes.length === 0 && !showCreate ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No AI Attributes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                AI Attributes let Colony automatically score, classify, and summarize your contacts using AI.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSeedPresets} disabled={seeding}>
                  <Wand2 className="h-4 w-4 mr-1.5" />
                  {seeding ? "Setting up..." : "Add Presets"}
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Custom
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          attributes.map((attr) => (
            <Card key={attr.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{attr.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {outputTypeLabels[attr.outputType] || attr.outputType}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {attr.entityType}
                      </span>
                      {attr.isPreset && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Preset
                        </span>
                      )}
                      {attr.autoRun && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{attr.prompt}</p>
                    {attr.options && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {(attr.options as string[]).map((opt) => (
                          <span key={opt} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(attr)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(attr.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
