/**
 * MCP Create Tools — Products Module
 *
 * Wraps the existing product service create operations so MCP clients have the
 * same surface as POST /products, POST /products/tags, POST /products/discount-types.
 * RBAC is enforced inside each handler via `assertMcpPermission` so behavior
 * matches the HTTP routes.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import { assertPlanLimitByTenantId } from "@/middlewares/enforcePlanLimits";
import productService from "@/modules/products/product.service";
import {
  CreateProductSchema,
  CreateProductTagSchema,
  CreateDiscountTypeSchema,
  type CreateProductDto,
  type CreateDiscountTypeDto,
} from "@/modules/products/product.schema";

export function registerProductsCreateMcpTools(
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
    "create_product",
    {
      title: "Create product",
      description:
        "Create a new product with at least one variation. Mirrors POST /products. Variations may have attribute combinations, sub-variants, and photos. Returns the created product.",
      inputSchema: CreateProductSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.CREATE");
        await assertPlanLimitByTenantId(authCtx.tenantId, "products");
        const product = await productService.create(dto as CreateProductDto, {
          tenantId: authCtx.tenantId,
          userId: authCtx.userId,
        });
        return mcpJsonResponse(product);
      } catch (err) {
        return mcpErrorResponse(err, "create_product failed");
      }
    },
  );

  registerTool(
    "create_product_tag",
    {
      title: "Create product tag",
      description:
        "Create an internal-only product tag for grouping products. Mirrors POST /products/tags.",
      inputSchema: CreateProductTagSchema.shape,
    },
    async ({ name }: { name: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.CATEGORIES.CREATE");
        const result = await productService.createTag(authCtx.tenantId, name);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "create_product_tag failed");
      }
    },
  );

  registerTool(
    "create_discount_type",
    {
      title: "Create discount type",
      description:
        "Create a reusable discount type (name + default percentage) that can be attached to products. Mirrors POST /products/discount-types.",
      inputSchema: CreateDiscountTypeSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.DISCOUNTS.CREATE");
        const result = await productService.createDiscountType(
          authCtx.tenantId,
          dto as CreateDiscountTypeDto,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "create_discount_type failed");
      }
    },
  );
}
