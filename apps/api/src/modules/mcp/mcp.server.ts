/**
 * MCP server factory for IMS.
 *
 * One McpServer per request (stateless transport pattern). Tools wrap
 * tenant-scoped Prisma queries — auto-scoping injects tenantId via
 * AsyncLocalStorage (see config/prisma.ts), so the same context that
 * carries the auth chain into Express handlers also reaches MCP tools.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/config/prisma";
import { getVersion } from "@/config/version";
import { createSale } from "@/modules/sales/sale.service";

export interface McpAuthContext {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userRole?: string;
}

export function createMcpServer(authCtx: McpAuthContext): McpServer {
  const { tenantSlug } = authCtx;
  const server = new McpServer({
    name: "ims-mcp",
    version: getVersion(),
  });

  // The SDK's registerTool overloads tangle with our strictNullChecks=false
  // tsconfig — TS hits TS2589 ("excessively deep") on the deeper inputSchema
  // inference. Bypass the overload by aliasing the method to a loose
  // signature; Zod still validates at runtime so handler safety is unchanged.
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
    "list_products",
    {
      title: "List products",
      description:
        "List products for the authenticated tenant. Supports search by name or imsCode and pagination.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Match against product name or imsCode (case-insensitive)"),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional().describe("Product id to paginate after"),
      },
    },
    async ({ search, limit, cursor }) => {
      const take = limit ?? 25;
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { imsCode: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : undefined;

      const rows = await prisma.product.findMany({
        where,
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { dateCreated: "desc" },
        select: {
          id: true,
          imsCode: true,
          name: true,
          mrp: true,
          finalSp: true,
          costPrice: true,
          category: { select: { name: true } },
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  registerTool(
    "list_contacts",
    {
      title: "List contacts",
      description:
        "List CRM contacts for the authenticated tenant. Supports search and pagination.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Match firstName, lastName, email, or phone"),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      },
    },
    async ({ search, limit, cursor }) => {
      const take = limit ?? 25;
      const where = search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : undefined;

      const rows = await prisma.contact.findMany({
        where,
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          source: true,
          purchaseCount: true,
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  registerTool(
    "sales_summary",
    {
      title: "Sales summary",
      description:
        "Aggregate sales totals/count for the authenticated tenant within a date range.",
      inputSchema: {
        from: z
          .string()
          .optional()
          .describe("ISO date lower bound (inclusive)"),
        to: z.string().optional().describe("ISO date upper bound (exclusive)"),
        locationId: z.string().optional(),
      },
    },
    async ({ from, to, locationId }) => {
      const where: Record<string, unknown> = { isLatest: true };
      if (locationId) where.locationId = locationId;
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lt: new Date(to) } : {}),
        };
      }

      const [agg, count] = await Promise.all([
        prisma.sale.aggregate({
          where,
          _sum: { total: true, subtotal: true, discount: true },
        }),
        prisma.sale.count({ where }),
      ]);

      const summary = {
        tenantSlug,
        count,
        total: agg._sum.total?.toString() ?? "0",
        subtotal: agg._sum.subtotal?.toString() ?? "0",
        discount: agg._sum.discount?.toString() ?? "0",
        range: {
          from: from ?? null,
          to: to ?? null,
          locationId: locationId ?? null,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  registerTool(
    "list_deals",
    {
      title: "List deals",
      description: "List open deals for the authenticated tenant.",
      inputSchema: {
        stage: z.string().optional().describe("Filter by exact stage label"),
        status: z.enum(["OPEN", "WON", "LOST"]).optional(),
        limit: z.number().int().min(1).max(100).default(25),
      },
    },
    async ({ stage, status, limit }) => {
      const take = limit ?? 25;
      const where: Record<string, unknown> = {};
      if (stage) where.stage = stage;
      if (status) where.status = status;

      const rows = await prisma.deal.findMany({
        where,
        take,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          stage: true,
          status: true,
          value: true,
          probability: true,
          expectedCloseDate: true,
          contact: { select: { firstName: true, lastName: true } },
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  registerTool(
    "inventory_levels",
    {
      title: "Inventory levels",
      description:
        "Return per-location inventory quantities for a product, scoped to the authenticated tenant.",
      inputSchema: {
        productId: z.string().describe("Product id"),
      },
    },
    async ({ productId }) => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          imsCode: true,
          variations: {
            select: {
              id: true,
              stockQuantity: true,
              locationInventory: {
                select: {
                  quantity: true,
                  location: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (!product) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "product_not_found", productId }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      };
    },
  );

  registerTool(
    "create_sale",
    {
      title: "Create sale",
      description:
        "Record a new POS sale at a showroom location. Items reference product variation IDs; payments are optional and use uppercase method codes like CASH, CARD, ESEWA. Returns the created sale with computed totals.",
      inputSchema: {
        locationId: z.string().uuid().describe("Showroom location id"),
        memberPhone: z
          .string()
          .optional()
          .describe(
            "Member phone to find or create a member; converts sale to MEMBER type",
          ),
        memberName: z
          .string()
          .optional()
          .describe("Required when memberPhone refers to a new member"),
        contactId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional CRM contact id to attribute the sale to"),
        isCreditSale: z.boolean().optional().default(false),
        notes: z.string().optional(),
        items: z
          .array(
            z.object({
              variationId: z.string().uuid(),
              subVariationId: z.string().uuid().nullable().optional(),
              quantity: z.number().int().positive(),
              manualDiscountPercent: z.number().min(0).max(100).optional(),
              manualDiscountAmount: z.number().min(0).optional(),
              discountReason: z.string().max(500).optional(),
              promoCode: z.string().optional(),
            }),
          )
          .min(1, "At least one item is required"),
        payments: z
          .array(
            z.object({
              method: z
                .string()
                .regex(/^[A-Z0-9_]+$/, "Use uppercase codes like CASH, CARD"),
              amount: z.number().min(0),
            }),
          )
          .optional(),
      },
    },
    async (dto) => {
      try {
        const sale = await createSale(
          {
            tenantId: authCtx.tenantId,
            userId: authCtx.userId,
            userRole: authCtx.userRole,
          },
          dto as Parameters<typeof createSale>[1],
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: sale.id,
                  saleCode: sale.saleCode,
                  type: sale.type,
                  isCreditSale: sale.isCreditSale,
                  locationId: sale.locationId,
                  memberId: sale.memberId,
                  contactId: sale.contactId,
                  subtotal: sale.subtotal?.toString(),
                  discount: sale.discount?.toString(),
                  promoDiscount: sale.promoDiscount?.toString(),
                  total: sale.total?.toString(),
                  createdAt: sale.createdAt,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: err?.message ?? "Sale creation failed",
                statusCode: err?.statusCode ?? 500,
              }),
            },
          ],
        };
      }
    },
  );

  return server;
}
