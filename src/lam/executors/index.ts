// ============================================================================
// COLONY LAM - Executor Registry
// Merges all domain executor modules into a single lookup table
// ============================================================================

import type { ActionExecutor } from "../types";
import { crmExecutors } from "./crm";
import { commsExecutors } from "./comms";
import { adsExecutors } from "./ads";
import { googleExecutors } from "./google";
import { contactsExecutors } from "./contacts";
import { marketingExecutors } from "./marketing";

/**
 * Combined executor registry — maps action type strings to executor functions.
 * Domain modules are merged in order; later modules override earlier ones
 * (no conflicts expected since each domain uses unique prefixes).
 */
export const executors: Record<string, ActionExecutor> = {
  ...crmExecutors,
  ...commsExecutors,
  ...adsExecutors,
  ...googleExecutors,
  ...contactsExecutors,
  ...marketingExecutors,
};
