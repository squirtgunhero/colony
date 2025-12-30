"use client";

import { CommandPalette } from "./CommandPalette";
import { useRouter } from "next/navigation";

export function AICommandPalette() {
  const router = useRouter();
  
  const handleWidgetCreated = () => {
    // Refresh the page to show new widgets if on dashboard
    router.refresh();
  };

  return <CommandPalette onWidgetCreated={handleWidgetCreated} />;
}

