/**
 * MCP Create Tools — Blog Module
 *
 * Mirrors POST /blog/posts, POST /blog/posts/:id/publish, POST /blog/posts/:id/unpublish.
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
import blogService from "@/modules/blog/blog.service";
import {
  CreateBlogPostSchema,
  type CreateBlogPostInput,
} from "@/modules/blog/blog.schema";

export function registerBlogCreateMcpTools(
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
    slug: z
      .string()
      .describe("URL slug, lowercase letters/digits/dashes (max 80)"),
    title: z.string().min(1).max(200),
    excerpt: z.string().max(500).optional().nullable(),
    bodyMarkdown: z
      .string()
      .min(1)
      .max(100_000)
      .optional()
      .describe("Markdown body; one of bodyMarkdown or body is required"),
    body: BlockTreeSchema.optional().describe(
      "Canonical block tree (alternative to bodyMarkdown)",
    ),
    scheduledPublishAt: z.string().datetime().optional().nullable(),
    heroImageUrl: z.string().max(1000).optional().nullable(),
    coverImageUrl: z.string().max(1000).optional().nullable(),
    icon: z.string().max(80).optional().nullable(),
    authorName: z.string().max(120).optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    seoTitle: z.string().max(200).optional().nullable(),
    seoDescription: z.string().max(500).optional().nullable(),
  };

  registerTool(
    "create_blog_post",
    {
      title: "Create blog post",
      description:
        "Create a new blog post (draft by default). Provide bodyMarkdown or body. Mirrors POST /blog/posts.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.CREATE");
        const dto = CreateBlogPostSchema.parse(raw) as CreateBlogPostInput;
        const post = await blogService.createPost(
          authCtx.tenantId,
          dto,
          authCtx.userId,
        );
        return mcpJsonResponse(post);
      } catch (err) {
        return mcpErrorResponse(err, "create_blog_post failed");
      }
    },
  );

  registerTool(
    "publish_blog_post",
    {
      title: "Publish blog post",
      description:
        "Flip a blog post to PUBLISHED. Mirrors POST /blog/posts/:id/publish.",
      inputSchema: {
        postId: z.string().uuid().describe("Blog post id"),
      },
    },
    async ({ postId }: { postId: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.PUBLISH");
        const post = await blogService.publishPost(
          authCtx.tenantId,
          postId,
          authCtx.userId,
        );
        return mcpJsonResponse(post);
      } catch (err) {
        return mcpErrorResponse(err, "publish_blog_post failed");
      }
    },
  );

  registerTool(
    "unpublish_blog_post",
    {
      title: "Unpublish blog post",
      description:
        "Revert a published blog post back to DRAFT. Mirrors POST /blog/posts/:id/unpublish.",
      inputSchema: {
        postId: z.string().uuid().describe("Blog post id"),
      },
    },
    async ({ postId }: { postId: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.PUBLISH");
        const post = await blogService.unpublishPost(
          authCtx.tenantId,
          postId,
          authCtx.userId,
        );
        return mcpJsonResponse(post);
      } catch (err) {
        return mcpErrorResponse(err, "unpublish_blog_post failed");
      }
    },
  );
}
