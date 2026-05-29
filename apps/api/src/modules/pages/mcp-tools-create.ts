/**
 * MCP Create Tools — Pages Module
 *
 * Mirrors POST /pages, POST /pages/:id/publish, POST /pages/:id/unpublish.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BlockTreeSchema } from "@repo/shared";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import pagesService from "@/modules/pages/pages.service";
import {
  CreateTenantPageSchema,
  LAYOUT_VARIANTS,
  type CreateTenantPageInput,
} from "@/modules/pages/pages.schema";

export function registerPagesCreateMcpTools(
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
    slug: z.string().describe("URL slug; reserved slugs are rejected"),
    title: z.string().min(1).max(200),
    bodyMarkdown: z.string().min(1).max(200_000).optional(),
    body: BlockTreeSchema.optional(),
    scheduledPublishAt: z.string().datetime().optional().nullable(),
    layoutVariant: z.enum(LAYOUT_VARIANTS).optional(),
    showInNav: z.boolean().optional(),
    navOrder: z.number().int().min(0).max(10_000).optional(),
    coverImageUrl: z.string().max(1000).optional().nullable(),
    icon: z.string().max(80).optional().nullable(),
    seoTitle: z.string().max(200).optional().nullable(),
    seoDescription: z.string().max(500).optional().nullable(),
  };

  registerTool(
    "create_page",
    {
      title: "Create page",
      description:
        "Create a new tenant CMS page. Provide bodyMarkdown or body. Mirrors POST /pages.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.CREATE");
        const dto = CreateTenantPageSchema.parse(raw) as CreateTenantPageInput;
        const page = await pagesService.createPage(
          authCtx.tenantId,
          dto,
          authCtx.userId,
        );
        return mcpJsonResponse(page);
      } catch (err) {
        return mcpErrorResponse(err, "create_page failed");
      }
    },
  );

  registerTool(
    "publish_page",
    {
      title: "Publish page",
      description: "Flip a page to PUBLISHED. Mirrors POST /pages/:id/publish.",
      inputSchema: {
        pageId: z.string().uuid().describe("Page id"),
      },
    },
    async ({ pageId }: { pageId: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.PUBLISH");
        const page = await pagesService.publishPage(
          authCtx.tenantId,
          pageId,
          authCtx.userId,
        );
        return mcpJsonResponse(page);
      } catch (err) {
        return mcpErrorResponse(err, "publish_page failed");
      }
    },
  );

  registerTool(
    "unpublish_page",
    {
      title: "Unpublish page",
      description:
        "Revert a published page back to DRAFT. Mirrors POST /pages/:id/unpublish.",
      inputSchema: {
        pageId: z.string().uuid().describe("Page id"),
      },
    },
    async ({ pageId }: { pageId: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.PUBLISH");
        const page = await pagesService.unpublishPage(
          authCtx.tenantId,
          pageId,
          authCtx.userId,
        );
        return mcpJsonResponse(page);
      } catch (err) {
        return mcpErrorResponse(err, "unpublish_page failed");
      }
    },
  );
}
