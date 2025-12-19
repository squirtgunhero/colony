"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DealDialog } from "./deal-dialog";
import { updateDealStage, deleteDeal } from "@/app/(dashboard)/deals/actions";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/date-utils";
import { FavoriteDealButton } from "@/components/favorites/favorite-deal-button";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  notes: string | null;
  isFavorite: boolean;
  contact: { id: string; name: string } | null;
  property: { id: string; address: string; city: string } | null;
}

interface Contact {
  id: string;
  name: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
}

interface DealsBoardProps {
  deals: Deal[];
  contacts: Contact[];
  properties: Property[];
}

const stages = [
  { id: "new_lead", label: "New Lead", color: "bg-blue-500" },
  { id: "qualified", label: "Qualified", color: "bg-purple-500" },
  { id: "showing", label: "Showing", color: "bg-amber-500" },
  { id: "offer", label: "Offer", color: "bg-orange-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-pink-500" },
  { id: "closed", label: "Closed", color: "bg-green-500" },
];

export function DealsBoard({ deals, contacts, properties }: DealsBoardProps) {
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);

  const getDealsByStage = (stageId: string) =>
    deals.filter((deal) => deal.stage === stageId);

  const handleDragStart = (dealId: string) => {
    setDraggedDeal(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stageId: string) => {
    if (draggedDeal) {
      await updateDealStage(draggedDeal, stageId);
      setDraggedDeal(null);
    }
  };

  const moveToStage = async (dealId: string, direction: "prev" | "next") => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    const currentIndex = stages.findIndex((s) => s.id === deal.stage);
    const newIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, stages.length - 1)
        : Math.max(currentIndex - 1, 0);

    if (currentIndex !== newIndex) {
      await updateDealStage(dealId, stages[newIndex].id);
    }
  };

  const getTotalValue = (stageId: string) => {
    return getDealsByStage(stageId).reduce(
      (sum, deal) => sum + (deal.value || 0),
      0
    );
  };

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className="flex-shrink-0 w-72 sm:w-80"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(stage.id)}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                  <CardTitle className="text-sm font-medium">
                    {stage.label}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {getDealsByStage(stage.id).length}
                  </Badge>
                </div>
              </div>
              {getTotalValue(stage.id) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(getTotalValue(stage.id))} total
                </p>
              )}
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 px-2">
                  {getDealsByStage(stage.id).length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      No deals
                    </div>
                  ) : (
                    getDealsByStage(stage.id).map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => handleDragStart(deal.id)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <Card className="bg-card/50 hover:bg-card transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <Link 
                                href={`/deals/${deal.id}`}
                                className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors flex-1"
                              >
                                {deal.title}
                              </Link>
                              <div className="flex items-center -mt-1 -mr-2">
                                <FavoriteDealButton
                                  dealId={deal.id}
                                  isFavorite={deal.isFavorite}
                                />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 -mt-1 -mr-2"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DealDialog
                                    deal={deal}
                                    contacts={contacts}
                                    properties={properties}
                                  >
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </DealDialog>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={async () => {
                                      await deleteDeal(deal.id);
                                      toast.success("Deal deleted", {
                                        description: `${deal.title} has been removed.`,
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </div>

                            {deal.value !== null && deal.value > 0 && (
                              <p className="text-primary font-semibold mt-2">
                                {formatCurrency(deal.value)}
                              </p>
                            )}

                            <div className="mt-3 space-y-1">
                              {deal.contact && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">
                                    {deal.contact.name}
                                  </span>
                                </div>
                              )}
                              {deal.property && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  <span className="truncate">
                                    {deal.property.address}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Quick move buttons */}
                            <div className="flex justify-between mt-3 pt-2 border-t border-border">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={stage.id === "new_lead"}
                                onClick={() => moveToStage(deal.id, "prev")}
                              >
                                <ChevronLeft className="h-3 w-3 mr-1" />
                                Back
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={stage.id === "closed"}
                                onClick={() => moveToStage(deal.id, "next")}
                              >
                                Next
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

