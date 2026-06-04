/**
 * MCP update/read tools — Leads module.
 *
 * Mirrors PUT /leads/:id, GET /leads/:id, GET /leads. update_lead accepts
 * partial fields and runs the same reference validation as create:
 * assignedToId must exist; source must be a valid CrmSource (rejected with the
 * option list otherwise).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import leadService from "@/modules/leads/lead.service";
import {
  UpdateLeadSchema,
  type UpdateLeadDto,
} from "@/modules/leads/lead.schema";

export function registerLeadsUpdateMcpTools(
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
    "list_leads",
    {
      title: "List leads",
      description:
        "List sales leads for the tenant. Supports search and limit. Use to find a lead id.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.LEADS.VIEW");
        const result = await leadService.getAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_leads failed");
      }
    },
  );

  registerTool(
    "get_lead",
    {
      title: "Get lead",
      description: "Fetch a single lead by id. Use list_leads to find the id.",
      inputSchema: { id: z.string().uuid().describe("Target lead id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.LEADS.VIEW");
        const lead = await leadService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(lead);
      } catch (err) {
        return mcpErrorResponse(err, "get_lead failed");
      }
    },
  );

  registerTool(
    "update_lead",
    {
      title: "Update lead",
      description:
        "Update a lead. Mirrors PUT /leads/:id. Only provided fields change. " +
        "References validated: assignedToId must exist; source must be a valid contact source " +
        "(call list_crm_sources — unknown values are rejected with the options).",
      inputSchema: {
        id: z.string().uuid().describe("Target lead id"),
        ...UpdateLeadSchema.shape,
      },
    },
    async (args: { id: string } & UpdateLeadDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.LEADS.UPDATE");
        const { id, ...data } = args;
        const lead = await leadService.update(
          authCtx.tenantId,
          id,
          data as UpdateLeadDto,
        );
        return mcpJsonResponse(lead);
      } catch (err) {
        return mcpErrorResponse(err, "update_lead failed");
      }
    },
  );
}
