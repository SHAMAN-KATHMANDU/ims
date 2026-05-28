import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerDailySalesAnalysisPrompt } from "./daily-sales-analysis.prompt";
import { registerCrmStaffActivityReviewPrompt } from "./crm-staff-activity-review.prompt";
import { registerInventoryDecisionPrompt } from "./inventory-decision.prompt";

/**
 * Loose-typed alias for server.registerPrompt — mirrors the registerTool
 * workaround in mcp.server.ts. The SDK's generic over argsSchema collapses
 * into excessively deep type inference under our tsconfig (TS2589); aliasing
 * bypasses the overload while preserving runtime Zod validation.
 */
export type LoosePromptRegister = (
  name: string,
  config: {
    title?: string;
    description?: string;
    argsSchema?: Record<string, z.ZodTypeAny>;
  },
  handler: (args: any) => any,
) => unknown;

export function loosePromptRegister(server: McpServer): LoosePromptRegister {
  return server.registerPrompt.bind(server) as LoosePromptRegister;
}

export function registerYantraPrompts(server: McpServer) {
  registerDailySalesAnalysisPrompt(server);
  registerCrmStaffActivityReviewPrompt(server);
  registerInventoryDecisionPrompt(server);
}
