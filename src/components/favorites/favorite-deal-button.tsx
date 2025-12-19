"use client";

import { FavoriteButton } from "./favorite-button";
import { toggleDealFavorite } from "@/app/(dashboard)/favorites/actions";

interface FavoriteDealButtonProps {
  dealId: string;
  isFavorite: boolean;
  size?: "sm" | "md" | "lg";
}

export function FavoriteDealButton({
  dealId,
  isFavorite,
  size = "sm",
}: FavoriteDealButtonProps) {
  return (
    <FavoriteButton
      isFavorite={isFavorite}
      onToggle={() => toggleDealFavorite(dealId)}
      size={size}
    />
  );
}

