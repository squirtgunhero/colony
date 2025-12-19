"use client";

// ============================================
// COLONY CRM - Context Provider
// Exposes route, selected entity, and filters
// ============================================

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { AssistantContext } from "@/lib/assistant/types";

interface CRMContextValue extends AssistantContext {
  setSelectedEntity: (entity: AssistantContext["selectedEntity"]) => void;
  setActiveFilters: (filters: Record<string, string>) => void;
  setPipelineStage: (stage: string | undefined) => void;
  getContext: () => AssistantContext;
}

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [selectedEntity, setSelectedEntity] = useState<AssistantContext["selectedEntity"]>();
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [pipelineStage, setPipelineStage] = useState<string>();

  const getContext = useCallback((): AssistantContext => ({
    route: pathname,
    selectedEntity,
    activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
    pipelineStage,
  }), [pathname, selectedEntity, activeFilters, pipelineStage]);

  return (
    <CRMContext.Provider
      value={{
        route: pathname,
        selectedEntity,
        activeFilters,
        pipelineStage,
        setSelectedEntity,
        setActiveFilters,
        setPipelineStage,
        getContext,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRMContext() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error("useCRMContext must be used within CRMContextProvider");
  }
  return context;
}

