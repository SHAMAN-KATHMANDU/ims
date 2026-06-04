/**
 * MCP read/update tools — Pages (CMS) module.
 * Mirrors GET/PUT /pages. UpdateTenantPageSchema is refined, so the input shape
 * is declared inline and parsed against the real schema in the handler.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import pagesService from "@/modules/pages/pages.service";
import {
  ListTenantPagesQuerySchema,
  UpdateTenantPageSchema,
  LAYOUT_VARIANTS,
  type UpdateTenantPageInput,
} from "@/modules/pages/pages.schema";

export function registerPagesUpdateMcpTools(
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
    "list_pages",
    {
      title: "List pages",
      description: "List CMS pages for the tenant. Use to find a page id.",
      inputSchema: {
        published: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (raw: { published?: boolean; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.VIEW");
        const query = ListTenantPagesQuerySchema.parse({
          page: 1,
          limit: raw.limit ?? 50,
          ...(raw.published !== undefined ? { published: raw.published } : {}),
        });
        const result = await pagesService.listPages(authCtx.tenantId, query);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_pages failed");
      }
    },
  );

  registerTool(
    "get_page",
    {
      title: "Get page",
      description: "Fetch a single CMS page by id.",
      inputSchema: { id: z.string().uuid().describe("Target page id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.VIEW");
        const page = await pagesService.getPage(authCtx.tenantId, id);
        return mcpJsonResponse(page);
      } catch (err) {
        return mcpErrorResponse(err, "get_page failed");
      }
    },
  );

  registerTool(
    "update_page",
    {
      title: "Update page",
      description:
        "Update a CMS page. Mirrors PUT /pages/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target page id"),
        slug: z.string().optional(),
        title: z.string().min(1).max(200).optional(),
        bodyMarkdown: z.string().min(1).max(200_000).optional(),
        scheduledPublishAt: z.string().datetime().optional().nullable(),
        layoutVariant: z.enum(LAYOUT_VARIANTS).optional(),
        showInNav: z.boolean().optional(),
        navOrder: z.number().int().min(0).max(10_000).optional(),
        coverImageUrl: z.string().max(1000).optional().nullable(),
        seoTitle: z.string().max(200).optional().nullable(),
        seoDescription: z.string().max(500).optional().nullable(),
      },
    },
    async (args: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.UPDATE");
        const { id, ...raw } = args;
        const dto = UpdateTenantPageSchema.parse(raw) as UpdateTenantPageInput;
        const page = await pagesService.updatePage(
          authCtx.tenantId,
          id,
          dto,
          authCtx.userId,
        );
        return mcpJsonResponse(page);
      } catch (err) {
        return mcpErrorResponse(err, "update_page failed");
      }
    },
  );
}
