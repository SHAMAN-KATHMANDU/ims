/**
 * MCP CRU tools — Redirects module (SEO URL redirects).
 * Mirrors GET/POST /redirects and GET/PUT /redirects/:id. The REST router
 * gates every operation (including reads) behind WEBSITE.SITE.UPDATE, so the
 * MCP tools do the same. Deletes stay admin-UI only.
 * Create/Update schemas are ZodEffects (.refine), so tools expose inline
 * shapes and re-parse with the real schemas.
 * Note service arg order: create(tenantId, data) but update(id, tenantId, data).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import redirectsService from "@/modules/redirects/redirects.service";
import {
  CreateRedirectSchema,
  UpdateRedirectSchema,
  type CreateRedirectDto,
  type UpdateRedirectDto,
} from "@/modules/redirects/redirects.schema";

export function registerRedirectsMcpTools(
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
    "list_redirects",
    {
      title: "List redirects",
      description:
        "List all URL redirects for the tenant site. Mirrors GET /redirects.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.SITE.UPDATE");
        const redirects = await redirectsService.listAll(authCtx.tenantId);
        return mcpJsonResponse(redirects);
      } catch (err) {
        return mcpErrorResponse(err, "list_redirects failed");
      }
    },
  );

  registerTool(
    "get_redirect",
    {
      title: "Get redirect",
      description: "Fetch a single redirect by id. Mirrors GET /redirects/:id.",
      inputSchema: { id: z.string().uuid().describe("Target redirect id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.SITE.UPDATE");
        const redirect = await redirectsService.getById(id, authCtx.tenantId);
        return mcpJsonResponse(redirect);
      } catch (err) {
        return mcpErrorResponse(err, "get_redirect failed");
      }
    },
  );

  registerTool(
    "create_redirect",
    {
      title: "Create redirect",
      description:
        "Create a URL redirect (fromPath → toPath, both must start with /). Mirrors POST /redirects. Rejects duplicates of fromPath and redirect cycles.",
      inputSchema: {
        fromPath: z.string().describe("Source path, must start with /"),
        toPath: z.string().describe("Destination path, must start with /"),
        isActive: z.boolean().optional(),
      },
    },
    async (raw: Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.SITE.UPDATE");
        const dto = CreateRedirectSchema.parse(raw) as CreateRedirectDto;
        const redirect = await redirectsService.create(authCtx.tenantId, dto);
        return mcpJsonResponse(redirect);
      } catch (err) {
        return mcpErrorResponse(err, "create_redirect failed");
      }
    },
  );

  registerTool(
    "update_redirect",
    {
      title: "Update redirect",
      description:
        "Update a redirect's paths or active flag. Mirrors PUT /redirects/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target redirect id"),
        fromPath: z.string().optional(),
        toPath: z.string().optional(),
        isActive: z.boolean().optional(),
      },
    },
    async (raw: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.SITE.UPDATE");
        const { id, ...rest } = raw;
        const dto = UpdateRedirectSchema.parse(rest) as UpdateRedirectDto;
        const redirect = await redirectsService.update(
          id,
          authCtx.tenantId,
          dto,
        );
        return mcpJsonResponse(redirect);
      } catch (err) {
        return mcpErrorResponse(err, "update_redirect failed");
      }
    },
  );
}
