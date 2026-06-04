/**
 * MCP update/read tools — Members module.
 * Mirrors GET /members, GET /members/:id, PUT /members/:id.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import memberService from "@/modules/members/member.service";
import {
  UpdateMemberSchema,
  type UpdateMemberDto,
} from "@/modules/members/member.schema";

export function registerMembersUpdateMcpTools(
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
    "list_members",
    {
      title: "List members",
      description:
        "[LOOKUP-READ] List loyalty members for the tenant. Use to find a member id before linking it to a contact/deal/sale or to update it.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MEMBERS.VIEW");
        const result = await memberService.findAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_members failed");
      }
    },
  );

  registerTool(
    "get_member",
    {
      title: "Get member",
      description: "Fetch a single member by id.",
      inputSchema: { id: z.string().uuid().describe("Target member id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MEMBERS.VIEW");
        const member = await memberService.findById(authCtx.tenantId, id);
        return mcpJsonResponse(member);
      } catch (err) {
        return mcpErrorResponse(err, "get_member failed");
      }
    },
  );

  registerTool(
    "update_member",
    {
      title: "Update member",
      description:
        "Update a member. Mirrors PUT /members/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target member id"),
        ...UpdateMemberSchema.shape,
      },
    },
    async (args: { id: string } & UpdateMemberDto) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MEMBERS.UPDATE");
        const { id, ...data } = args;
        const member = await memberService.update(
          authCtx.tenantId,
          id,
          data as UpdateMemberDto,
        );
        return mcpJsonResponse(member);
      } catch (err) {
        return mcpErrorResponse(err, "update_member failed");
      }
    },
  );
}
