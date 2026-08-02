/**
 * MCP CRU tools — Collections module.
 * Mirrors GET/POST /collections, GET/PATCH /collections/:id and
 * PUT /collections/:id/products. Deletes stay admin-UI only.
 * Note service arg order: everything is (tenantId, id?, data?).
 * UpdateCollectionSchema is a ZodEffects (.refine), so update_collection
 * exposes an inline shape and re-parses with the real schema.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import collectionsService from "@/modules/collections/collections.service";
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/modules/collections/collections.schema";

export function registerCollectionsMcpTools(
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
    "list_collections",
    {
      title: "List collections",
      description:
        "[LOOKUP-READ] List product collections (with product counts) for the tenant. Mirrors GET /collections.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.COLLECTIONS.VIEW");
        const collections = await collectionsService.list(authCtx.tenantId);
        return mcpJsonResponse(collections);
      } catch (err) {
        return mcpErrorResponse(err, "list_collections failed");
      }
    },
  );

  registerTool(
    "get_collection",
    {
      title: "Get collection",
      description:
        "Fetch a single collection by id, including its product ids. Mirrors GET /collections/:id.",
      inputSchema: { id: z.string().uuid().describe("Target collection id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.COLLECTIONS.VIEW");
        const collection = await collectionsService.get(authCtx.tenantId, id);
        return mcpJsonResponse(collection);
      } catch (err) {
        return mcpErrorResponse(err, "get_collection failed");
      }
    },
  );

  registerTool(
    "create_collection",
    {
      title: "Create collection",
      description:
        "Create a product collection (curated product group for the storefront). Mirrors POST /collections. Slugs are lower-kebab-case and unique per tenant.",
      inputSchema: CreateCollectionSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.COLLECTIONS.CREATE");
        const collection = await collectionsService.create(
          authCtx.tenantId,
          dto as CreateCollectionInput,
        );
        return mcpJsonResponse(collection);
      } catch (err) {
        return mcpErrorResponse(err, "create_collection failed");
      }
    },
  );

  registerTool(
    "update_collection",
    {
      title: "Update collection",
      description:
        "Update a collection's slug/title/subtitle/sort/active flag. Mirrors PATCH /collections/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target collection id"),
        slug: z.string().optional(),
        title: z.string().min(1).max(120).optional(),
        subtitle: z.string().max(300).nullable().optional(),
        sort: z.number().int().min(0).max(1000).optional(),
        isActive: z.boolean().optional(),
      },
    },
    async (raw: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.COLLECTIONS.UPDATE");
        const { id, ...rest } = raw;
        const patch = UpdateCollectionSchema.parse(
          rest,
        ) as UpdateCollectionInput;
        const collection = await collectionsService.update(
          authCtx.tenantId,
          id,
          patch,
        );
        return mcpJsonResponse(collection);
      } catch (err) {
        return mcpErrorResponse(err, "update_collection failed");
      }
    },
  );

  registerTool(
    "set_collection_products",
    {
      title: "Set collection products",
      description:
        "Replace the product list of a collection. Mirrors PUT /collections/:id/products. Returns accepted and skipped product ids — resolve ids via list_products first.",
      inputSchema: {
        id: z.string().uuid().describe("Target collection id"),
        productIds: z.array(z.string().uuid()).describe("Full product id list"),
      },
    },
    async ({ id, productIds }: { id: string; productIds: string[] }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.COLLECTIONS.UPDATE");
        const result = await collectionsService.setProducts(
          authCtx.tenantId,
          id,
          productIds,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "set_collection_products failed");
      }
    },
  );
}
