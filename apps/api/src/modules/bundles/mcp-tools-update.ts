/**
 * MCP update/read tools — Bundles module.
 * Mirrors GET /bundles, GET /bundles/:id, PUT /bundles/:id. productIds are
 * validated (must exist for the tenant) by the service. UpdateBundleSchema is
 * a refined schema (no `.shape`), so the input shape is declared inline and the
 * payload is parsed against the schema in the handler to enforce pricing rules.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import bundleService from "@/modules/bundles/bundle.service";
import {
  UpdateBundleSchema,
  type UpdateBundleDto,
} from "@/modules/bundles/bundle.schema";

export function registerBundlesUpdateMcpTools(
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
    "list_bundles",
    {
      title: "List bundles",
      description:
        "List product bundles for the tenant. Supports search and limit. Use to find a bundle id.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.BUNDLES.VIEW");
        const result = await bundleService.findAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_bundles failed");
      }
    },
  );

  registerTool(
    "get_bundle",
    {
      title: "Get bundle",
      description: "Fetch a single bundle by id.",
      inputSchema: { id: z.string().uuid().describe("Target bundle id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.BUNDLES.VIEW");
        const bundle = await bundleService.findById(authCtx.tenantId, id);
        if (!bundle) {
          return mcpErrorResponse(
            { message: "Bundle not found", statusCode: 404 },
            "get_bundle failed",
          );
        }
        return mcpJsonResponse(bundle);
      } catch (err) {
        return mcpErrorResponse(err, "get_bundle failed");
      }
    },
  );

  registerTool(
    "update_bundle",
    {
      title: "Update bundle",
      description:
        "Update a bundle. Mirrors PUT /bundles/:id. Only provided fields change. " +
        "productIds must reference existing products (rejected otherwise).",
      inputSchema: {
        id: z.string().uuid().describe("Target bundle id"),
        name: z.string().min(1).max(200).optional(),
        slug: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).nullish(),
        productIds: z.array(z.string().uuid()).max(100).optional(),
        pricingStrategy: z.enum(["SUM", "DISCOUNT_PCT", "FIXED"]).optional(),
        discountPct: z.number().int().min(0).max(100).nullish(),
        fixedPrice: z.number().int().min(0).nullish(),
        active: z.boolean().optional(),
      },
    },
    async (args: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.BUNDLES.UPDATE");
        const { id, ...raw } = args;
        const data = UpdateBundleSchema.parse(raw) as UpdateBundleDto;
        const bundle = await bundleService.update(authCtx.tenantId, id, data);
        if (!bundle) {
          return mcpErrorResponse(
            { message: "Bundle not found", statusCode: 404 },
            "update_bundle failed",
          );
        }
        return mcpJsonResponse(bundle);
      } catch (err) {
        return mcpErrorResponse(err, "update_bundle failed");
      }
    },
  );
}
