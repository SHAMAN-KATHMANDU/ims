/**
 * MCP read tools — Activities module.
 *
 * Activities are append-only (create + delete only), so there is no update
 * tool. These expose GET /activities/:id and the by-contact / by-deal lists.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import activityService from "@/modules/activities/activity.service";

export function registerActivitiesReadMcpTools(
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
    "get_activity",
    {
      title: "Get activity",
      description: "Fetch a single CRM activity by id.",
      inputSchema: { id: z.string().uuid().describe("Target activity id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.ACTIVITIES.VIEW");
        const activity = await activityService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(activity);
      } catch (err) {
        return mcpErrorResponse(err, "get_activity failed");
      }
    },
  );

  registerTool(
    "list_activities",
    {
      title: "List activities",
      description:
        "List CRM activities for a contact or a deal (provide exactly one of contactId / dealId). Optionally filter by type.",
      inputSchema: {
        contactId: z
          .string()
          .uuid()
          .optional()
          .describe("List for this contact"),
        dealId: z.string().uuid().optional().describe("List for this deal"),
        type: z.enum(["CALL", "EMAIL", "MEETING"]).optional(),
      },
    },
    async ({
      contactId,
      dealId,
      type,
    }: {
      contactId?: string;
      dealId?: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.ACTIVITIES.VIEW");
        if (contactId) {
          const result = await activityService.getByContact(
            authCtx.tenantId,
            contactId,
            type ? { type } : undefined,
          );
          return mcpJsonResponse(result);
        }
        if (dealId) {
          const result = await activityService.getByDeal(
            authCtx.tenantId,
            dealId,
            type ? { type } : undefined,
          );
          return mcpJsonResponse(result);
        }
        return mcpErrorResponse(
          { message: "Provide either contactId or dealId.", statusCode: 400 },
          "list_activities failed",
        );
      } catch (err) {
        return mcpErrorResponse(err, "list_activities failed");
      }
    },
  );
}
