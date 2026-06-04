/**
 * MCP update/read tools — Promos module.
 * Mirrors GET /promos, GET /promos/:id, PUT /promos/:id. Product/category
 * targeting is resolved + tenant-scoped by the service (resolveTargetProductIds).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import promoService from "@/modules/promos/promo.service";
import {
  UpdatePromoSchema,
  type UpdatePromoDto,
} from "@/modules/promos/promo.schema";

export function registerPromosUpdateMcpTools(
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
    "list_promos",
    {
      title: "List promo codes",
      description:
        "List promo codes for the tenant. Supports search and limit. Use to find a promo id.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PROMOS.VIEW");
        const result = await promoService.findAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_promos failed");
      }
    },
  );

  registerTool(
    "get_promo",
    {
      title: "Get promo code",
      description: "Fetch a single promo code by id.",
      inputSchema: { id: z.string().uuid().describe("Target promo id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PROMOS.VIEW");
        const promo = await promoService.findById(authCtx.tenantId, id);
        if (!promo) {
          return mcpErrorResponse(
            { message: "Promo not found", statusCode: 404 },
            "get_promo failed",
          );
        }
        return mcpJsonResponse(promo);
      } catch (err) {
        return mcpErrorResponse(err, "get_promo failed");
      }
    },
  );

  registerTool(
    "update_promo",
    {
      title: "Update promo code",
      description:
        "Update a promo code. Mirrors PUT /promos/:id. Only provided fields change. " +
        "Targeted products/categories are resolved and tenant-scoped by the service.",
      inputSchema: {
        id: z.string().uuid().describe("Target promo id"),
        ...UpdatePromoSchema.shape,
      },
    },
    async (args: { id: string } & UpdatePromoDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PROMOS.UPDATE");
        const { id, ...data } = args;
        const promo = await promoService.update(
          authCtx.tenantId,
          id,
          data as UpdatePromoDto,
        );
        if (!promo) {
          return mcpErrorResponse(
            { message: "Promo not found", statusCode: 404 },
            "update_promo failed",
          );
        }
        return mcpJsonResponse(promo);
      } catch (err) {
        return mcpErrorResponse(err, "update_promo failed");
      }
    },
  );
}
