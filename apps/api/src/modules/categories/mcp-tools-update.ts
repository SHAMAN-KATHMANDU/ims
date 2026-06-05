/**
 * MCP update/read tools — Categories module.
 * Mirrors GET /categories, GET /categories/:id, PUT /categories/:id.
 * Note service arg order: findById(id, tenantId), update(id, tenantId, data).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import categoryService from "@/modules/categories/category.service";
import {
  UpdateCategorySchema,
  type UpdateCategoryDto,
} from "@/modules/categories/category.schema";

export function registerCategoriesUpdateMcpTools(
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
    "list_categories",
    {
      title: "List categories",
      description:
        "[LOOKUP-READ] List product categories for the tenant. Use to find a category before assigning it to a product or to update it.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.CATEGORIES.VIEW");
        const result = await categoryService.findAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_categories failed");
      }
    },
  );

  registerTool(
    "get_category",
    {
      title: "Get category",
      description: "Fetch a single category (with subcategories) by id.",
      inputSchema: { id: z.string().uuid().describe("Target category id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.CATEGORIES.VIEW");
        const category = await categoryService.findById(id, authCtx.tenantId);
        return mcpJsonResponse(category);
      } catch (err) {
        return mcpErrorResponse(err, "get_category failed");
      }
    },
  );

  registerTool(
    "update_category",
    {
      title: "Update category",
      description:
        "Update a category. Mirrors PUT /categories/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target category id"),
        ...UpdateCategorySchema.shape,
      },
    },
    async (args: { id: string } & UpdateCategoryDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.CATEGORIES.UPDATE");
        const { id, ...data } = args;
        const category = await categoryService.update(
          id,
          authCtx.tenantId,
          data as UpdateCategoryDto,
        );
        return mcpJsonResponse(category);
      } catch (err) {
        return mcpErrorResponse(err, "update_category failed");
      }
    },
  );
}
