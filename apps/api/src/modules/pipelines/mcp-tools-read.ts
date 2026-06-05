/**
 * MCP read tools — Pipelines module.
 *
 * list_pipelines / get_pipeline expose pipeline definitions INCLUDING their
 * stages, so the AI can pick a valid pipelineId + stage before creating or
 * updating a deal. (Pipeline editing — restructuring stages — stays in the UI;
 * its update schema carries cross-field stage refinements unsuited to a simple
 * MCP tool.)
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

export function registerPipelinesReadMcpTools(
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
    "list_pipelines",
    {
      title: "List pipelines",
      description:
        "[LOOKUP-READ] List sales pipelines with their stages. Call before creating/updating a deal to choose a valid pipelineId and stage.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "CRM.PIPELINES.VIEW");
        const result = await pipelineService.getAll(authCtx.tenantId);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_pipelines failed");
      }
    },
  );

  registerTool(
    "get_pipeline",
    {
      title: "Get pipeline",
      description:
        "Fetch a single pipeline (with its stages) by id. Use the stage names here as the `stage` when creating/updating a deal on this pipeline.",
      inputSchema: { id: z.string().uuid().describe("Target pipeline id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.PIPELINES.VIEW");
        const pipeline = await pipelineService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(pipeline);
      } catch (err) {
        return mcpErrorResponse(err, "get_pipeline failed");
      }
    },
  );
}
