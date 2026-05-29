/**
 * MCP Create Tools — Leads Module
 *
 * Mirrors POST /leads, POST /leads/:id/convert, POST /leads/:id/assign.
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
  CreateLeadSchema,
  ConvertLeadSchema,
  AssignLeadSchema,
  type CreateLeadDto,
  type ConvertLeadDto,
  type AssignLeadDto,
} from "@/modules/leads/lead.schema";

export function registerLeadsCreateMcpTools(
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
    "create_lead",
    {
      title: "Create lead",
      description:
        "Create a new sales lead with optional company/source/status. Mirrors POST /leads.",
      inputSchema: CreateLeadSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.LEADS.CREATE");
        const lead = await leadService.create(
          authCtx.tenantId,
          authCtx.userId,
          dto as CreateLeadDto,
        );
        return mcpJsonResponse(lead);
      } catch (err) {
        return mcpErrorResponse(err, "create_lead failed");
      }
    },
  );

  registerTool(
    "convert_lead",
    {
      title: "Convert lead",
      description:
        "Promote a lead to a contact + deal. If dealName/dealValue/pipelineId are omitted, sensible defaults are used. Mirrors POST /leads/:id/convert.",
      inputSchema: {
        leadId: z.string().uuid().describe("Source lead id"),
        ...ConvertLeadSchema.shape,
      },
    },
    async (args: { leadId: string } & ConvertLeadDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.LEADS.CONVERT");
        const { leadId, ...data } = args;
        const result = await leadService.convert(
          authCtx.tenantId,
          authCtx.userId,
          leadId,
          data,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "convert_lead failed");
      }
    },
  );

  registerTool(
    "assign_lead",
    {
      title: "Assign lead",
      description:
        "Assign or reassign a lead to a user. Mirrors POST /leads/:id/assign.",
      inputSchema: {
        leadId: z.string().uuid().describe("Source lead id"),
        ...AssignLeadSchema.shape,
      },
    },
    async (args: { leadId: string } & AssignLeadDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.LEADS.ASSIGN");
        const { leadId, ...data } = args;
        const lead = await leadService.assign(
          authCtx.tenantId,
          authCtx.userId,
          leadId,
          data,
        );
        return mcpJsonResponse(lead);
      } catch (err) {
        return mcpErrorResponse(err, "assign_lead failed");
      }
    },
  );
}
