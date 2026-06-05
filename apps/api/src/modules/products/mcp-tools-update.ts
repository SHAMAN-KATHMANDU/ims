/**
 * MCP update/read tools — Products module.
 * Mirrors GET /products/:id and PUT /products/:id. The product service already
 * validates categoryId/vendorId/etc. references on update. findById/update take
 * the product id without a tenant arg, so we guard tenant ownership here.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import productService from "@/modules/products/product.service";
import { listNamedLookup } from "@/shared/validation/reference-validator";
import {
  UpdateProductSchema,
  type UpdateProductDto,
} from "@/modules/products/product.schema";

export function registerProductsUpdateMcpTools(
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

  // findById returns a product with tenantId; guard ownership for this tenant.
  async function findOwnedProduct(id: string) {
    const product = (await productService.findById(id)) as
      | ({ tenantId?: string } & Record<string, unknown>)
      | null;
    if (!product || product.tenantId !== authCtx.tenantId) return null;
    return product;
  }

  registerTool(
    "list_discount_types",
    {
      title: "List discount types",
      description:
        "[LOOKUP-READ] List the tenant's discount types. Use to find a valid discount type before assigning one to a product.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.VIEW");
        const options = await listNamedLookup(
          authCtx.tenantId,
          "discount_type",
        );
        return mcpJsonResponse(options);
      } catch (err) {
        return mcpErrorResponse(err, "list_discount_types failed");
      }
    },
  );

  registerTool(
    "list_product_tags",
    {
      title: "List product tags",
      description:
        "[LOOKUP-READ] List the tenant's product tags. Use to find valid tag ids before tagging a product.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.VIEW");
        const options = await listNamedLookup(authCtx.tenantId, "product_tag");
        return mcpJsonResponse(options);
      } catch (err) {
        return mcpErrorResponse(err, "list_product_tags failed");
      }
    },
  );

  registerTool(
    "get_product",
    {
      title: "Get product",
      description:
        "Fetch a single product (with variations, attributes, category, vendor) by id. Use list_products to find the id.",
      inputSchema: { id: z.string().uuid().describe("Target product id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.VIEW");
        const product = await findOwnedProduct(id);
        if (!product) {
          return mcpErrorResponse(
            { message: "Product not found", statusCode: 404 },
            "get_product failed",
          );
        }
        return mcpJsonResponse(product);
      } catch (err) {
        return mcpErrorResponse(err, "get_product failed");
      }
    },
  );

  registerTool(
    "update_product",
    {
      title: "Update product",
      description:
        "Update a product. Mirrors PUT /products/:id. Only provided fields change. " +
        "References are validated by the service: categoryId must exist; vendorId, " +
        "discount types, attribute values, and tag ids must belong to the tenant.",
      inputSchema: {
        id: z.string().uuid().describe("Target product id"),
        ...UpdateProductSchema.shape,
      },
    },
    async (args: { id: string } & UpdateProductDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.UPDATE");
        const { id, ...data } = args;
        const owned = await findOwnedProduct(id);
        if (!owned) {
          return mcpErrorResponse(
            { message: "Product not found", statusCode: 404 },
            "update_product failed",
          );
        }
        const product = await productService.update(
          id,
          data as UpdateProductDto,
          {
            tenantId: authCtx.tenantId,
            userId: authCtx.userId,
          },
        );
        return mcpJsonResponse(product);
      } catch (err) {
        return mcpErrorResponse(err, "update_product failed");
      }
    },
  );
}
