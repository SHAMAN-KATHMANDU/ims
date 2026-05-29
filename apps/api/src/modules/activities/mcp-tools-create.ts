/**
 * MCP Create Tools — Activities Module
 *
 * Mirrors POST /activities.
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
import {
  CreateActivitySchema,
  ActivityTypeSchema,
  type CreateActivityDto,
} from "@/modules/activities/activity.schema";

export function registerActivitiesCreateMcpTools(
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

  // CreateActivitySchema is `.refine()`-wrapped; re-declare the input shape so
  // the MCP client knows the fields. The refine (at-least-one-link check) is
  // still enforced server-side by parsing the original schema below.
  const inputShape = {
    type: ActivityTypeSchema,
    subject: z.string().max(500).optional(),
    notes: z.string().optional(),
    activityAt: z
      .string()
      .datetime()
      .optional()
      .describe("ISO datetime; defaults to now"),
    contactId: z.string().uuid().optional().nullable(),
    memberId: z.string().uuid().optional().nullable(),
    dealId: z.string().uuid().optional().nullable(),
  };

  registerTool(
    "create_activity",
    {
      title: "Create activity",
      description:
        "Log a CRM activity (CALL/EMAIL/MEETING) against a contact, member, or deal. At least one of contactId/memberId/dealId is required. Mirrors POST /activities.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "CRM.ACTIVITIES.CREATE");
        const dto = CreateActivitySchema.parse(raw) as CreateActivityDto;
        const activity = await activityService.create(
          authCtx.tenantId,
          authCtx.userId,
          dto,
        );
        return mcpJsonResponse(activity);
      } catch (err) {
        return mcpErrorResponse(err, "create_activity failed");
      }
    },
  );
}
