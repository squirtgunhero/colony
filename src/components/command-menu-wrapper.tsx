"use client";

import { CommandMenu } from "./command-menu";
import { globalSearch } from "@/app/(dashboard)/search/actions";

export function CommandMenuWrapper() {
  return <CommandMenu onSearch={globalSearch} />;
}

