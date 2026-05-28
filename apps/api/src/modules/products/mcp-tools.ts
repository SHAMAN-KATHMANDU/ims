/**
 * MCP tools for the Products module. Registered from mcp.server.ts.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/config/prisma";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";

export function registerProductsMcpTools(
  server: McpServer,
  _authCtx: McpAuthContext,
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
}
