/**
 * MCP Create Tools — Categories Module
 *
 * Mirrors POST /categories and POST /categories/:id/subcategories.
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
  CreateCategorySchema,
  CreateSubcategorySchema,
  type CreateCategoryDto,
  type CreateSubcategoryDto,
} from "@/modules/categories/category.schema";

export function registerCategoriesCreateMcpTools(
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
    "create_category",
    {
      title: "Create category",
      description: "Create a product category. Mirrors POST /categories.",
      inputSchema: CreateCategorySchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.CATEGORIES.CREATE");
        const cat = await categoryService.create(
          authCtx.tenantId,
          dto as CreateCategoryDto,
        );
        return mcpJsonResponse(cat);
      } catch (err) {
        return mcpErrorResponse(err, "create_category failed");
      }
    },
  );

  registerTool(
    "create_subcategory",
    {
      title: "Create subcategory",
      description:
        "Add a subcategory under an existing category. Mirrors POST /categories/:id/subcategories.",
      inputSchema: {
        categoryId: z.string().uuid().describe("Parent category id"),
        ...CreateSubcategorySchema.shape,
      },
    },
    async (args: { categoryId: string } & CreateSubcategoryDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.CATEGORIES.UPDATE");
        const { categoryId, ...data } = args;
        const sub = await categoryService.createSubcategory(
          categoryId,
          authCtx.tenantId,
          data,
        );
        return mcpJsonResponse(sub);
      } catch (err) {
        return mcpErrorResponse(err, "create_subcategory failed");
      }
    },
  );
}
