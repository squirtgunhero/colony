import { z } from "zod";

export interface LAMContext {
  profileId: string;
  runId?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ActionDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: T;
  riskTier: 0 | 1 | 2;
  execute: (params: z.infer<T>, context: LAMContext) => Promise<ActionResult>;
}
