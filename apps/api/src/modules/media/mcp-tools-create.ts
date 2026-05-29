/**
 * MCP Create Tools — Media Module
 *
 * Mirrors POST /media/presign and POST /media/assets. The S3 binary PUT
 * between presign and register is the caller's responsibility — same as
 * the HTTP API.
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
  PresignBodySchema,
  RegisterMediaAssetSchema,
  type PresignBodyDto,
  type RegisterMediaAssetDto,
} from "@/modules/media/media.schema";

const mediaService = new MediaService();

export function registerMediaCreateMcpTools(
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

  const presignInputShape = {
    purpose: z.enum([
      "product_photo",
      "contact_attachment",
      "library",
      "message_media",
    ]),
    mimeType: z.string().min(1).max(120),
    fileName: z.string().max(255).optional(),
    contentLength: z
      .number()
      .int()
      .positive()
      .max(200 * 1024 * 1024)
      .describe("Exact upload size in bytes"),
    entityType: z.string().optional(),
    entityId: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe("Required for contact_attachment and message_media purposes"),
  };

  registerTool(
    "presign_media_upload",
    {
      title: "Presign media upload",
      description:
        "Get a signed URL to PUT a binary asset to S3. After uploading, call register_media_asset with the returned storageKey to record it. Mirrors POST /media/presign.",
      inputSchema: presignInputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.MEDIA.CREATE");
        const dto = PresignBodySchema.parse(raw) as PresignBodyDto;
        const result = await mediaService.presign(authCtx.tenantId, dto);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "presign_media_upload failed");
      }
    },
  );

  registerTool(
    "register_media_asset",
    {
      title: "Register media asset",
      description:
        "Record a media asset that has already been uploaded to S3 (via presign_media_upload). Mirrors POST /media/assets.",
      inputSchema: RegisterMediaAssetSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "WEBSITE.MEDIA.CREATE");
        const result = await mediaService.registerAsset(
          authCtx.tenantId,
          authCtx.userId,
          dto as RegisterMediaAssetDto,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "register_media_asset failed");
      }
    },
  );
}
