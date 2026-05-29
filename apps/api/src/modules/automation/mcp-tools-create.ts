/**
 * MCP Create Tools — Automation Module
 *
 * Mirrors POST /workflows/definitions. The create schema uses .superRefine() and
 * nested step/trigger schemas, so we present a loose top-level input shape and
 * defer full validation to `CreateAutomationDefinitionSchema.parse()` inside
 * the handler.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import automationService from "@/modules/automation/automation.service";
import {
  CreateAutomationDefinitionSchema,
  type CreateAutomationDefinitionDto,
} from "@/modules/automation/automation.schema";

export function registerAutomationCreateMcpTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  const inputShape = {
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional().nullable(),
    scopeType: z.string().describe("Automation scope type (see schema)"),
    scopeId: z.string().uuid().optional().nullable(),
    status: z.string().optional().describe("Status (see schema)"),
    executionMode: z.string().optional(),
    suppressLegacyWorkflows: z.boolean().optional(),
    triggers: z
      .array(z.record(z.unknown()))
      .min(1)
      .describe("At least one trigger; see CreateAutomationTriggerSchema"),
    steps: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Step actions; mutually exclusive with flowGraph"),
    flowGraph: z
      .unknown()
      .optional()
      .nullable()
      .describe("Phase-3 DAG; if set, steps must be empty"),
  };

  registerTool(
    "create_automation_definition",
    {
      title: "Create automation definition",
      description:
        "Create a CRM automation (triggers + steps OR flowGraph). Mirrors POST /workflows/definitions.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "CRM.AUTOMATIONS.CREATE");
        const dto = CreateAutomationDefinitionSchema.parse(
          raw,
        ) as CreateAutomationDefinitionDto;
        const def = await automationService.createDefinition(
          authCtx.tenantId,
          authCtx.userId,
          dto,
        );
        return mcpJsonResponse(def);
      } catch (err) {
        return mcpErrorResponse(err, "create_automation_definition failed");
      }
    },
  );
}
