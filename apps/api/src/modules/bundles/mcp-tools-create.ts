/**
 * MCP Create Tools — Bundles Module
 *
 * Mirrors POST /bundles. CreateBundleSchema is .superRefine()-wrapped, so we
 * re-declare the input shape here for the MCP client and validate against the
 * full refined schema inside the handler.
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
  CreateBundleSchema,
  type CreateBundleDto,
} from "@/modules/bundles/bundle.schema";

export function registerBundlesCreateMcpTools(
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

  const inputShape = {
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(200)
      .describe("URL-safe slug, lowercase alphanumerics + hyphens"),
    description: z.string().max(5000).optional().nullable(),
    productIds: z.array(z.string().uuid()).max(100),
    pricingStrategy: z
      .enum(["SUM", "DISCOUNT_PCT", "FIXED"])
      .optional()
      .describe("Defaults to SUM"),
    discountPct: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .nullable()
      .describe("Required when pricingStrategy=DISCOUNT_PCT"),
    fixedPrice: z
      .number()
      .int()
      .min(0)
      .optional()
      .nullable()
      .describe("Required when pricingStrategy=FIXED"),
    active: z.boolean().optional().describe("Defaults to true"),
  };

  registerTool(
    "create_bundle",
    {
      title: "Create product bundle",
      description:
        "Create a product bundle (group of products sold together) with a pricing strategy. Mirrors POST /bundles.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.BUNDLES.CREATE");
        const dto = CreateBundleSchema.parse(raw) as CreateBundleDto;
        const bundle = await bundleService.create(authCtx.tenantId, dto);
        return mcpJsonResponse(bundle);
      } catch (err) {
        return mcpErrorResponse(err, "create_bundle failed");
      }
    },
  );
}
