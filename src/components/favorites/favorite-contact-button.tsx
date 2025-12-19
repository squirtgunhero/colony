"use client";

import { FavoriteButton } from "./favorite-button";
import { toggleContactFavorite } from "@/app/(dashboard)/favorites/actions";

interface FavoriteContactButtonProps {
  contactId: string;
  isFavorite: boolean;
  size?: "sm" | "md" | "lg";
}

export function FavoriteContactButton({
  contactId,
  isFavorite,
  size = "sm",
}: FavoriteContactButtonProps) {
  return (
    <FavoriteButton
      isFavorite={isFavorite}
      onToggle={() => toggleContactFavorite(contactId)}
      size={size}
    />
  );
}

