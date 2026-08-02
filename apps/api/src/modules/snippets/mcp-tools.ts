/**
 * MCP CRU tools — Snippets module (tracking/embed snippets for the site).
 * Mirrors GET/POST /snippets and GET/PATCH /snippets/:id, reusing the pages
 * permission keys the REST router uses. Deletes stay admin-UI only.
 * UpdateSnippetSchema is a ZodEffects (.refine), so update_snippet exposes an
 * inline shape and re-parses with the real schema.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import snippetsService from "@/modules/snippets/snippets.service";
import {
  CreateSnippetSchema,
  UpdateSnippetSchema,
  ListSnippetsQuerySchema,
} from "@/modules/snippets/snippets.schema";

export function registerSnippetsMcpTools(
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
    "list_snippets",
    {
      title: "List snippets",
      description:
        "List site snippets (tracking pixels, embeds) for the tenant. Mirrors GET /snippets.",
      inputSchema: ListSnippetsQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.VIEW");
        const result = await snippetsService.list(
          authCtx.tenantId,
          ListSnippetsQuerySchema.parse(query ?? {}),
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_snippets failed");
      }
    },
  );

  registerTool(
    "get_snippet",
    {
      title: "Get snippet",
      description: "Fetch a single snippet by id. Mirrors GET /snippets/:id.",
      inputSchema: { id: z.string().uuid().describe("Target snippet id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.VIEW");
        const snippet = await snippetsService.get(authCtx.tenantId, id);
        return mcpJsonResponse(snippet);
      } catch (err) {
        return mcpErrorResponse(err, "get_snippet failed");
      }
    },
  );

  registerTool(
    "create_snippet",
    {
      title: "Create snippet",
      description: "Create a site snippet. Mirrors POST /snippets.",
      inputSchema: CreateSnippetSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.CREATE");
        const snippet = await snippetsService.create(
          authCtx.tenantId,
          CreateSnippetSchema.parse(dto),
        );
        return mcpJsonResponse(snippet);
      } catch (err) {
        return mcpErrorResponse(err, "create_snippet failed");
      }
    },
  );

  registerTool(
    "update_snippet",
    {
      title: "Update snippet",
      description:
        "Update a snippet. Mirrors PATCH /snippets/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target snippet id"),
        slug: z.string().optional(),
        title: z.string().min(1).max(160).optional(),
        category: z.string().max(60).optional(),
        body: z.array(z.unknown()).optional().describe("Block tree JSON"),
      },
    },
    async (raw: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.PAGES.UPDATE");
        const { id, ...rest } = raw;
        const input = UpdateSnippetSchema.parse(rest);
        const snippet = await snippetsService.update(
          authCtx.tenantId,
          id,
          input,
        );
        return mcpJsonResponse(snippet);
      } catch (err) {
        return mcpErrorResponse(err, "update_snippet failed");
      }
    },
  );
}
