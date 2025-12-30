"use client";

/**
 * Command Bar Component
 * Natural language input for creating widgets
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Command, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommandBarProps {
  onWidgetCreated: (widgetSpec: unknown) => void;
}

type Status = "idle" | "loading" | "success" | "error";

interface StatusMessage {
  type: Status;
  text: string;
  suggestions?: string[];
}

export function CommandBar({ onWidgetCreated }: CommandBarProps) {
  const [command, setCommand] = useState("");
  const [status, setStatus] = useState<StatusMessage>({ type: "idle", text: "" });
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsExpanded(true);
      }
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);
  
  // Submit command to API
  const submitCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    setStatus({ type: "loading", text: "Processing your command..." });
    
    try {
      const response = await fetch("/api/widget/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: command }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setStatus({ 
          type: "success", 
          text: `Created ${data.widgetSpec.widgetType.replace("_", " ")} widget` 
        });
        onWidgetCreated(data.widgetSpec);
        setCommand("");
        
        // Clear success message after delay
        setTimeout(() => {
          setStatus({ type: "idle", text: "" });
        }, 3000);
      } else {
        setStatus({
          type: "error",
          text: data.error || "Failed to create widget",
          suggestions: data.suggestions,
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        text: "Failed to connect to server",
      });
    }
  }, [command, onWidgetCreated]);
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCommand();
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    setStatus({ type: "idle", text: "" });
    inputRef.current?.focus();
  };
  
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-xl border bg-card transition-all",
          isExpanded 
            ? "border-primary/30 shadow-lg shadow-primary/5 ring-2 ring-primary/10" 
            : "border-border hover:border-border/80",
          status.type === "error" && "border-destructive/30",
          status.type === "success" && "border-green-500/30"
        )}>
          {/* Icon */}
          <div className="flex-shrink-0">
            {status.type === "loading" ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : status.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : status.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </div>
          
          {/* Input */}
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => !command && setIsExpanded(false)}
            placeholder='Type a command like "Add a KPI card showing new leads last 7 days"'
            className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
            disabled={status.type === "loading"}
          />
          
          {/* Submit button */}
          <Button
            type="submit"
            size="sm"
            disabled={!command.trim() || status.type === "loading"}
            className="flex-shrink-0"
          >
            {status.type === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
          
          {/* Keyboard hint */}
          {!isExpanded && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">⌘K</kbd>
            </div>
          )}
        </div>
        
        {/* Status message */}
        {status.type !== "idle" && status.text && (
          <div className={cn(
            "mt-2 px-4 py-2 rounded-lg text-sm flex items-start gap-2",
            status.type === "error" && "bg-destructive/10 text-destructive",
            status.type === "success" && "bg-green-500/10 text-green-600 dark:text-green-400",
            status.type === "loading" && "bg-muted text-muted-foreground"
          )}>
            <span>{status.text}</span>
          </div>
        )}
        
        {/* Suggestions */}
        {status.type === "error" && status.suggestions && status.suggestions.length > 0 && (
          <div className="mt-2 px-4 py-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {status.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs rounded-full bg-background border hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

