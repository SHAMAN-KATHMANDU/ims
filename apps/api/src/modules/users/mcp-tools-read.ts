/**
 * MCP read-only tools — Users module.
 * Mirrors GET /users and GET /users/:id. Deliberately read-only over MCP
 * (user lifecycle, password resets, and role changes stay in the admin UI).
 * The repository selects USER_PUBLIC_SELECT everywhere, so no password
 * hashes or secrets appear in responses. Tenant scoping is ambient
 * (runWithTenant + Prisma extension), matching the REST controllers.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import userService from "@/modules/users/user.service";

export function registerUsersReadMcpTools(
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
    "list_users",
    {
      title: "List users",
      description:
        "[READ-ONLY] List workspace users (public fields only), paginated, optionally filtered by role. Mirrors GET /users. User creation/updates happen in the admin UI.",
      inputSchema: {
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
        role: z
          .enum(["platformAdmin", "superAdmin", "admin", "user"])
          .optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.USERS.VIEW");
        const result = await userService.findAll(args ?? {});
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_users failed");
      }
    },
  );

  registerTool(
    "get_user",
    {
      title: "Get user",
      description:
        "[READ-ONLY] Fetch a single workspace user by id (public fields only). Mirrors GET /users/:id.",
      inputSchema: { id: z.string().uuid().describe("Target user id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.USERS.VIEW");
        const user = await userService.findById(id);
        return mcpJsonResponse(user);
      } catch (err) {
        return mcpErrorResponse(err, "get_user failed");
      }
    },
  );
}
