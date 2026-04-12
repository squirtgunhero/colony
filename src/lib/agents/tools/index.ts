// ============================================================================
// Agent Tool Definitions: Aggregated Index
// All custom tools available to the Tara orchestrator agent
// ============================================================================

import { contactTools } from "./contacts";
import { dealTools } from "./deals";
import { taskTools } from "./tasks";
import { commsTools } from "./comms";
import { pipelineTools } from "./pipeline";
import { playbookTools } from "./playbooks";
import { searchTools } from "./search";
import { honeycombTools } from "./honeycomb";

/** All custom tools for the single-agent Tara (Phase 1) */
export const CRM_CUSTOM_TOOLS = [
  ...contactTools,
  ...dealTools,
  ...taskTools,
  ...commsTools,
  ...pipelineTools,
  ...playbookTools,
  ...searchTools,
];

/** Honeycomb tools are separate for Phase 3 sub-agent */
export { honeycombTools };

/** Re-export individual groups for sub-agent tool assignment (Phase 3) */
export { contactTools, dealTools, taskTools, commsTools, pipelineTools, playbookTools, searchTools };
