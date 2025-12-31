"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "claimed", label: "Claimed" },
  { value: "assigned", label: "Assigned" },
  { value: "closed", label: "Closed" },
];

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "real_estate", label: "Real Estate" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
  { value: "insurance", label: "Insurance" },
  { value: "contractor", label: "Contractor" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "moving", label: "Moving" },
  { value: "other", label: "Other" },
];

const viewOptions = [
  { value: "all", label: "All Referrals" },
  { value: "mine", label: "My Referrals" },
  { value: "participating", label: "Participating" },
];

export function ReferralFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [view, setView] = useState(
    searchParams.get("createdByMe") === "true"
      ? "mine"
      : searchParams.get("participatingIn") === "true"
      ? "participating"
      : "all"
  );

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`/referrals?${params.toString()}`);
  };

  const handleSearch = () => {
    updateFilters({ search: search || null });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    updateFilters({ status: value === "all" ? null : value });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    updateFilters({ category: value === "all" ? null : value });
  };

  const handleViewChange = (value: string) => {
    setView(value);
    updateFilters({
      createdByMe: value === "mine" ? "true" : null,
      participatingIn: value === "participating" ? "true" : null,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setCategory("all");
    setView("all");
    router.push("/referrals");
  };

  const hasActiveFilters =
    search || status !== "all" || category !== "all" || view !== "all";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search referrals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                updateFilters({ search: null });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={view} onValueChange={handleViewChange}>
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {viewOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[130px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[150px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

