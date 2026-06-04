/**
 * MCP read/update tools — Automation module.
 * Mirrors GET/PUT /workflows/definitions. UpdateAutomationDefinitionSchema is
 * refined (nested triggers/steps + superRefine), so the input shape is loose
 * and parsed against the real schema in the handler — same pattern as create.
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
  GetAutomationDefinitionsQuerySchema,
  UpdateAutomationDefinitionSchema,
  type UpdateAutomationDefinitionDto,
} from "@/modules/automation/automation.schema";

export function registerAutomationUpdateMcpTools(
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

  registerTool(
    "list_automation_definitions",
    {
      title: "List automation definitions",
      description:
        "List CRM automation definitions for the tenant. Use to find a definition id.",
      inputSchema: {
        search: z.string().optional(),
      },
    },
    async (raw: { search?: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.AUTOMATIONS.VIEW");
        const query = GetAutomationDefinitionsQuerySchema.parse({
          ...(raw.search ? { search: raw.search } : {}),
        });
        const result = await automationService.getDefinitions(
          authCtx.tenantId,
          query,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_automation_definitions failed");
      }
    },
  );

  registerTool(
    "get_automation_definition",
    {
      title: "Get automation definition",
      description: "Fetch a single automation definition by id.",
      inputSchema: { id: z.string().uuid().describe("Target definition id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.AUTOMATIONS.VIEW");
        const def = await automationService.getDefinitionById(
          authCtx.tenantId,
          id,
        );
        return mcpJsonResponse(def);
      } catch (err) {
        return mcpErrorResponse(err, "get_automation_definition failed");
      }
    },
  );

  registerTool(
    "update_automation_definition",
    {
      title: "Update automation definition",
      description:
        "Update an automation definition. Mirrors PUT /workflows/definitions/:id. " +
        "Only provided fields change; triggers/steps/flowGraph are validated by the schema.",
      inputSchema: {
        id: z.string().uuid().describe("Target definition id"),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional().nullable(),
        scopeType: z.string().optional(),
        scopeId: z.string().uuid().optional().nullable(),
        status: z.string().optional(),
        executionMode: z.string().optional(),
        suppressLegacyWorkflows: z.boolean().optional(),
        triggers: z.array(z.record(z.unknown())).optional(),
        steps: z.array(z.record(z.unknown())).optional(),
        flowGraph: z.unknown().optional().nullable(),
      },
    },
    async (args: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "CRM.AUTOMATIONS.UPDATE");
        const { id, ...raw } = args;
        const dto = UpdateAutomationDefinitionSchema.parse(
          raw,
        ) as UpdateAutomationDefinitionDto;
        const def = await automationService.updateDefinition(
          authCtx.tenantId,
          id,
          authCtx.userId,
          dto,
        );
        return mcpJsonResponse(def);
      } catch (err) {
        return mcpErrorResponse(err, "update_automation_definition failed");
      }
    },
  );
}
