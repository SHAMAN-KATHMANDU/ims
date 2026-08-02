/**
 * MCP read/moderation tools — Reviews module.
 * Mirrors GET /reviews and PATCH /reviews/:id (status only).
 * Deletes stay admin-UI only.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import reviewsService from "@/modules/reviews/reviews.service";
import {
  ListReviewsQuerySchema,
  ReviewStatusSchema,
  UpdateReviewSchema,
} from "@/modules/reviews/reviews.schema";

export function registerReviewsReadMcpTools(
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
    "list_reviews",
    {
      title: "List reviews",
      description:
        "List product reviews, paginated, filterable by product and status (PENDING, APPROVED, REJECTED). Mirrors GET /reviews.",
      inputSchema: ListReviewsQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.REVIEWS.VIEW");
        const result = await reviewsService.list(
          authCtx.tenantId,
          ListReviewsQuerySchema.parse(query ?? {}),
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_reviews failed");
      }
    },
  );

  registerTool(
    "set_review_approval",
    {
      title: "Set review approval",
      description:
        "Moderate a review by setting its status (APPROVED, REJECTED, PENDING). Mirrors PATCH /reviews/:id. Resolve the review id via list_reviews first.",
      inputSchema: {
        id: z.string().uuid().describe("Target review id"),
        status: ReviewStatusSchema,
      },
    },
    async (raw: { id: string; status: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.REVIEWS.APPROVE");
        const { id, ...rest } = raw;
        const dto = UpdateReviewSchema.parse(rest);
        const review = await reviewsService.update(authCtx.tenantId, id, dto);
        return mcpJsonResponse(review);
      } catch (err) {
        return mcpErrorResponse(err, "set_review_approval failed");
      }
    },
  );
}
