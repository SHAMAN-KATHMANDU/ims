/**
 * MCP Create Tools — Pipelines Module
 *
 * Mirrors POST /pipelines and POST /pipelines/seed-framework.
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
  CreatePipelineSchema,
  type CreatePipelineDto,
} from "@/modules/pipelines/pipeline.schema";

export function registerPipelinesCreateMcpTools(
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
    name: z.string().min(1).max(255),
    type: z
      .enum(["GENERAL", "NEW_SALES", "REMARKETING", "REPURCHASE"])
      .optional(),
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
  };

  registerTool(
    "create_pipeline",
    {
      title: "Create pipeline",
      description:
        "Create a CRM pipeline with stages and optional won/lost stage markers. Mirrors POST /pipelines.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "CRM.PIPELINES.CREATE");
        const dto = CreatePipelineSchema.parse(raw) as CreatePipelineDto;
        const pipeline = await pipelineService.create(authCtx.tenantId, dto);
        return mcpJsonResponse(pipeline);
      } catch (err) {
        return mcpErrorResponse(err, "create_pipeline failed");
      }
    },
  );

  registerTool(
    "seed_pipeline_framework",
    {
      title: "Seed default pipeline framework",
      description:
        "Bootstrap the tenant with the standard set of CRM pipelines and stages. Mirrors POST /pipelines/seed-framework.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "CRM.PIPELINES.CREATE");
        const result = await pipelineService.seedFramework(authCtx.tenantId);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "seed_pipeline_framework failed");
      }
    },
  );
}
