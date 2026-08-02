/**
 * MCP read tools — Notifications module.
 * Mirrors GET /notifications. Notifications are per-user (created by the
 * system), so the tools read the calling token's user's notifications;
 * there are no create tools.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import notificationService from "@/modules/notifications/notification.service";
import type { NotificationListQuery } from "@/modules/notifications/notification.schema";

export function registerNotificationsReadMcpTools(
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
    "list_notifications",
    {
      title: "List notifications",
      description:
        "List the calling user's notifications, paginated, optionally unread-only. Mirrors GET /notifications.",
      inputSchema: {
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        unreadOnly: z.boolean().optional(),
      },
    },
    async (args: { page?: number; limit?: number; unreadOnly?: boolean }) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.NOTIFICATIONS.VIEW");
        const query = {
          page: args.page ?? 1,
          limit: args.limit ?? 20,
          unreadOnly: args.unreadOnly ?? false,
        } as NotificationListQuery;
        const result = await notificationService.getAll(authCtx.userId, query);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_notifications failed");
      }
    },
  );
}
