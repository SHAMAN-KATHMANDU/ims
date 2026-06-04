/**
 * MCP read/update tools — Blog module.
 * Mirrors GET/PUT /blog/posts and /blog/categories. categoryId is validated
 * against the tenant's BlogCategory inside blog.service. Update schemas are
 * refined (.partial().refine), so input shapes are declared inline and parsed
 * against the real schema in the handler.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import blogService from "@/modules/blog/blog.service";
import {
  ListBlogPostsQuerySchema,
  UpdateBlogPostSchema,
  CreateBlogCategorySchema,
  UpdateBlogCategorySchema,
  type UpdateBlogPostInput,
  type CreateBlogCategoryInput,
  type UpdateBlogCategoryInput,
} from "@/modules/blog/blog.schema";

export function registerBlogUpdateMcpTools(
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
    "list_blog_posts",
    {
      title: "List blog posts",
      description: "List blog posts for the tenant. Use to find a post id.",
      inputSchema: {
        search: z.string().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        categoryId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (raw: {
      search?: string;
      status?: string;
      categoryId?: string;
      limit?: number;
    }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.VIEW");
        const query = ListBlogPostsQuerySchema.parse({
          page: 1,
          limit: raw.limit ?? 20,
          ...(raw.search ? { search: raw.search } : {}),
          ...(raw.status ? { status: raw.status } : {}),
          ...(raw.categoryId ? { categoryId: raw.categoryId } : {}),
        });
        const result = await blogService.listPosts(authCtx.tenantId, query);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_blog_posts failed");
      }
    },
  );

  registerTool(
    "get_blog_post",
    {
      title: "Get blog post",
      description: "Fetch a single blog post by id.",
      inputSchema: { id: z.string().uuid().describe("Target blog post id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.VIEW");
        const post = await blogService.getPost(authCtx.tenantId, id);
        return mcpJsonResponse(post);
      } catch (err) {
        return mcpErrorResponse(err, "get_blog_post failed");
      }
    },
  );

  registerTool(
    "update_blog_post",
    {
      title: "Update blog post",
      description:
        "Update a blog post. Mirrors PUT /blog/posts/:id. Only provided fields change. categoryId must reference an existing blog category.",
      inputSchema: {
        id: z.string().uuid().describe("Target blog post id"),
        slug: z.string().optional(),
        title: z.string().min(1).max(200).optional(),
        excerpt: z.string().max(500).optional().nullable(),
        bodyMarkdown: z.string().min(1).max(100_000).optional(),
        scheduledPublishAt: z.string().datetime().optional().nullable(),
        heroImageUrl: z.string().max(1000).optional().nullable(),
        coverImageUrl: z.string().max(1000).optional().nullable(),
        icon: z.string().max(80).optional().nullable(),
        authorName: z.string().max(120).optional().nullable(),
        categoryId: z.string().uuid().optional().nullable(),
        tags: z.array(z.string().min(1).max(40)).max(20).optional(),
        seoTitle: z.string().max(200).optional().nullable(),
        seoDescription: z.string().max(500).optional().nullable(),
      },
    },
    async (args: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.UPDATE");
        const { id, ...raw } = args;
        const dto = UpdateBlogPostSchema.parse(raw) as UpdateBlogPostInput;
        const post = await blogService.updatePost(
          authCtx.tenantId,
          id,
          dto,
          authCtx.userId,
        );
        return mcpJsonResponse(post);
      } catch (err) {
        return mcpErrorResponse(err, "update_blog_post failed");
      }
    },
  );

  registerTool(
    "list_blog_categories",
    {
      title: "List blog categories",
      description:
        "[LOOKUP-READ] List blog categories. Use to find a valid categoryId for a blog post.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.VIEW");
        const categories = await blogService.listCategories(authCtx.tenantId);
        return mcpJsonResponse(categories);
      } catch (err) {
        return mcpErrorResponse(err, "list_blog_categories failed");
      }
    },
  );

  registerTool(
    "create_blog_category",
    {
      title: "Create blog category",
      description:
        "[LOOKUP-WRITE] Create a blog category. Confirm with the user before adding a new one. Mirrors POST /blog/categories.",
      inputSchema: CreateBlogCategorySchema.shape,
    },
    async (raw: CreateBlogCategoryInput) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.UPDATE");
        const category = await blogService.createCategory(
          authCtx.tenantId,
          raw,
        );
        return mcpJsonResponse(category);
      } catch (err) {
        return mcpErrorResponse(err, "create_blog_category failed");
      }
    },
  );

  registerTool(
    "update_blog_category",
    {
      title: "Update blog category",
      description: "Update a blog category. Mirrors PUT /blog/categories/:id.",
      inputSchema: {
        id: z.string().uuid().describe("Target blog category id"),
        slug: z.string().optional(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional().nullable(),
        sortOrder: z.number().int().min(0).max(10_000).optional(),
      },
    },
    async (args: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.BLOG.UPDATE");
        const { id, ...raw } = args;
        const dto = UpdateBlogCategorySchema.parse(
          raw,
        ) as UpdateBlogCategoryInput;
        const category = await blogService.updateCategory(
          authCtx.tenantId,
          id,
          dto,
        );
        return mcpJsonResponse(category);
      } catch (err) {
        return mcpErrorResponse(err, "update_blog_category failed");
      }
    },
  );
}
