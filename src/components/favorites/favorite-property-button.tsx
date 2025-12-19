"use client";

import { FavoriteButton } from "./favorite-button";
import { togglePropertyFavorite } from "@/app/(dashboard)/favorites/actions";

interface FavoritePropertyButtonProps {
  propertyId: string;
  isFavorite: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoritePropertyButton({
  propertyId,
  isFavorite,
  size = "sm",
  className,
}: FavoritePropertyButtonProps) {
  return (
    <FavoriteButton
      isFavorite={isFavorite}
      onToggle={() => togglePropertyFavorite(propertyId)}
      size={size}
      className={className}
    />
  );
}

