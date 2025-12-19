"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => Promise<void>;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline";
  className?: string;
}

export function FavoriteButton({
  isFavorite,
  onToggle,
  size = "md",
  variant = "ghost",
  className,
}: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic update
    setOptimisticFavorite(!optimisticFavorite);
    
    startTransition(async () => {
      try {
        await onToggle();
        toast.success(optimisticFavorite ? "Removed from favorites" : "Added to favorites");
      } catch (error) {
        // Revert on error
        setOptimisticFavorite(optimisticFavorite);
        toast.error("Failed to update favorite");
      }
    });
  };

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(sizeClasses[size], className)}
      onClick={handleClick}
      disabled={isPending}
    >
      <Star
        className={cn(
          iconSizes[size],
          "transition-colors",
          optimisticFavorite
            ? "fill-amber-400 text-amber-400"
            : "text-muted-foreground hover:text-amber-400"
        )}
      />
      <span className="sr-only">
        {optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  );
}

