/**
 * MCP read/update tools — Media module.
 * Mirrors GET /media/assets and PUT /media/assets/:id. (Media is append-via-
 * presign+register; there is no single-get endpoint, so only list + update.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import { MediaService } from "@/modules/media/media.service";
import {
  UpdateMediaAssetSchema,
  type UpdateMediaAssetDto,
} from "@/modules/media/media.schema";

export function registerMediaUpdateMcpTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  const mediaService = new MediaService();
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
    "list_media_assets",
    {
      title: "List media assets",
      description:
        "List media library assets for the tenant. Use to find a media asset id.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        folder: z.string().max(80).optional(),
        mimePrefix: z
          .string()
          .max(40)
          .optional()
          .describe("e.g. 'image/' or 'video/'"),
      },
    },
    async (raw: { limit?: number; folder?: string; mimePrefix?: string }) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.MEDIA.VIEW");
        const result = await mediaService.listAssets(authCtx.tenantId, {
          take: raw.limit ?? 20,
          ...(raw.folder ? { folder: raw.folder } : {}),
          ...(raw.mimePrefix ? { mimePrefix: raw.mimePrefix } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_media_assets failed");
      }
    },
  );

  registerTool(
    "update_media_asset",
    {
      title: "Update media asset",
      description:
        "Update a media asset's display name, alt text, or folder. Mirrors PUT /media/assets/:id.",
      inputSchema: {
        id: z.string().uuid().describe("Target media asset id"),
        ...UpdateMediaAssetSchema.shape,
      },
    },
    async (args: { id: string } & UpdateMediaAssetDto) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.MEDIA.UPDATE");
        const { id, ...data } = args;
        const asset = await mediaService.updateAsset(
          authCtx.tenantId,
          id,
          data as UpdateMediaAssetDto,
        );
        return mcpJsonResponse(asset);
      } catch (err) {
        return mcpErrorResponse(err, "update_media_asset failed");
      }
    },
  );
}
