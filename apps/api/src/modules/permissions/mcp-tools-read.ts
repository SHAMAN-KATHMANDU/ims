/**
 * MCP read-only tools — Permissions module (roles + RBAC visibility).
 * Mirrors GET /permissions/roles and GET /permissions/roles/:roleId.
 * Deliberately read-only over MCP: role creation, permission grants, and
 * user↔role assignment stay in the admin UI. The REST router gates role
 * reads behind SETTINGS.ROLES.MANAGE, so the MCP tools do the same.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import { roleService } from "@/modules/permissions/role.service";

export function registerPermissionsReadMcpTools(
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
    "list_roles",
    {
      title: "List roles",
      description:
        "[READ-ONLY] List the workspace's RBAC roles, paginated. Mirrors GET /permissions/roles. Role and permission changes happen in the admin UI.",
      inputSchema: {
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
      },
    },
    async (args: { page?: number; limit?: number; search?: string }) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.ROLES.MANAGE");
        const result = await roleService.listRoles(authCtx.tenantId, {
          ...(args.page ? { page: args.page } : {}),
          ...(args.limit ? { limit: args.limit } : {}),
          ...(args.search ? { search: args.search } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_roles failed");
      }
    },
  );

  registerTool(
    "get_role",
    {
      title: "Get role",
      description:
        "[READ-ONLY] Fetch a single role (with its permissions) by id. Mirrors GET /permissions/roles/:roleId.",
      inputSchema: { roleId: z.string().uuid().describe("Target role id") },
    },
    async ({ roleId }: { roleId: string }) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.ROLES.MANAGE");
        const role = await roleService.getRoleById(authCtx.tenantId, roleId);
        return mcpJsonResponse(role);
      } catch (err) {
        return mcpErrorResponse(err, "get_role failed");
      }
    },
  );
}
