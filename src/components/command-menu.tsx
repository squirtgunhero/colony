"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  Search, 
  UserCircle2, 
  Building, 
  Target, 
  CalendarCheck2,
  LayoutDashboard,
  PieChart,
  Plus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "contact" | "property" | "deal" | "task";
  title: string;
  subtitle?: string;
}

interface CommandMenuProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
}

export function CommandMenu({ onSearch }: CommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Toggle with ⌘/ or custom event (⌘K is reserved for AI)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const openFromEvent = () => {
      setOpen(true);
    };

    document.addEventListener("keydown", down);
    document.addEventListener("open-command-menu", openFromEvent);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-menu", openFromEvent);
    };
  }, []);

  // Search when query changes
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await onSearch(query);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, onSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    
    const routes: Record<string, string> = {
      contact: "/contacts",
      property: "/properties",
      deal: "/deals",
      task: "/tasks",
    };
    
    router.push(routes[result.type]);
  };

  const navigateTo = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contact":
        return <UserCircle2 className="h-4 w-4" />;
      case "property":
        return <Building className="h-4 w-4" />;
      case "deal":
        return <Target className="h-4 w-4" />;
      case "task":
        return <CalendarCheck2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Search"
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Accessible title for screen readers */}
      <DialogPrimitive.Title className="sr-only">
        Global Search
      </DialogPrimitive.Title>

      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Command Panel */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 p-4">
        <div className="overflow-hidden rounded-2xl shadow-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/10">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border/50 px-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search contacts, properties, deals..."
              className="flex-1 py-4 text-base outline-none placeholder:text-muted-foreground bg-transparent"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/50 px-2 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {loading && (
              <Command.Loading className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </Command.Loading>
            )}

            <Command.Empty className="p-4 text-center text-sm text-muted-foreground">
              {query.length < 2 ? "Type to search..." : "No results found."}
            </Command.Empty>

            {/* Quick Actions */}
            {!query && (
              <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <Command.Item
                  value="new-contact"
                  onSelect={() => navigateTo("/contacts")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Add New Contact</p>
                    <p className="text-xs text-muted-foreground">Create a new lead or client</p>
                  </div>
                </Command.Item>
                <Command.Item
                  value="new-deal"
                  onSelect={() => navigateTo("/deals")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/20">
                    <Plus className="h-4 w-4 text-chart-2" />
                  </div>
                  <div>
                    <p className="font-medium">Add New Deal</p>
                    <p className="text-xs text-muted-foreground">Start tracking a new deal</p>
                  </div>
                </Command.Item>
              </Command.Group>
            )}

            {/* Navigation */}
            {!query && (
              <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <Command.Item
                  value="dashboard"
                  onSelect={() => navigateTo("/dashboard")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </Command.Item>
                <Command.Item
                  value="contacts"
                  onSelect={() => navigateTo("/contacts")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span>Contacts</span>
                </Command.Item>
                <Command.Item
                  value="properties"
                  onSelect={() => navigateTo("/properties")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>Properties</span>
                </Command.Item>
                <Command.Item
                  value="deals"
                  onSelect={() => navigateTo("/deals")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>Deals</span>
                </Command.Item>
                <Command.Item
                  value="tasks"
                  onSelect={() => navigateTo("/tasks")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                  <span>Tasks</span>
                </Command.Item>
                <Command.Item
                  value="reports"
                  onSelect={() => navigateTo("/reports")}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent/50"
                >
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  <span>Reports</span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <Command.Group heading="Results" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {results.map((result) => (
                  <Command.Item
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.title}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{result.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5">esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}

