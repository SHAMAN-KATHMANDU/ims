/**
 * MCP update tools — Pipelines module.
 * Mirrors PUT /pipelines/:id.
 * UpdatePipelineSchema is a ZodEffects (.refine), so the tool exposes an inline
 * shape and re-parses with the real schema in the handler — same approach as
 * create_pipeline in mcp-tools-create.ts.
 * Note service arg order: update(tenantId, id, data).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import pipelineService from "@/modules/pipelines/pipeline.service";
import {
  UpdatePipelineSchema,
  type UpdatePipelineDto,
} from "@/modules/pipelines/pipeline.schema";

export function registerPipelinesUpdateMcpTools(
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
    "update_pipeline",
    {
      title: "Update pipeline",
      description:
        "Update a CRM pipeline (name, stages, default flag, won/lost stage markers). Mirrors PUT /pipelines/:id. Fetch the pipeline first (list_pipelines) — stages you send REPLACE the existing ones, and won/lost markers must name existing stages.",
      inputSchema: {
        id: z.string().uuid().describe("Target pipeline id"),
        name: z.string().min(1).max(255).optional(),
        stages: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              order: z.number(),
            }),
          )
          .optional(),
        isDefault: z.boolean().optional(),
        closedWonStageName: z.string().max(100).optional().nullable(),
        closedLostStageName: z.string().max(100).optional().nullable(),
      },
    },
    async (raw: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "CRM.PIPELINES.UPDATE");
        const { id, ...rest } = raw;
        const dto = UpdatePipelineSchema.parse(rest) as UpdatePipelineDto;
        const pipeline = await pipelineService.update(
          authCtx.tenantId,
          id,
          dto,
        );
        return mcpJsonResponse(pipeline);
      } catch (err) {
        return mcpErrorResponse(err, "update_pipeline failed");
      }
    },
  );
}
