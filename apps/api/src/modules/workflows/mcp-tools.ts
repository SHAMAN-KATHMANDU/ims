/**
 * MCP CRU tools — Workflows module (pipeline-bound trigger/action rules;
 * distinct from the automation module's automation definitions).
 * Mirrors GET/POST /workflows and GET/PUT /workflows/:id.
 * Deletes stay admin-UI only.
 * Note service arg order: everything is (tenantId, id?, data?).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import workflowService from "@/modules/workflows/workflow.service";
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  type CreateWorkflowDto,
  type UpdateWorkflowDto,
  type GetWorkflowsQueryDto,
} from "@/modules/workflows/workflow.schema";

export function registerWorkflowsMcpTools(
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
    "list_workflows",
    {
      title: "List workflows",
      description:
        "List pipeline workflows (trigger/action rules), optionally filtered by pipeline. Mirrors GET /workflows. Distinct from list_automation_definitions.",
      inputSchema: {
        pipelineId: z.string().uuid().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: { pipelineId?: string; page?: number; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.WORKFLOWS.VIEW");
        const query = {
          ...(args.pipelineId ? { pipelineId: args.pipelineId } : {}),
          page: args.page ?? 1,
          limit: args.limit ?? 20,
        } as GetWorkflowsQueryDto;
        const result = await workflowService.getAll(authCtx.tenantId, query);
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_workflows failed");
      }
    },
  );

  registerTool(
    "get_workflow",
    {
      title: "Get workflow",
      description:
        "Fetch a single workflow (with its rules) by id. Mirrors GET /workflows/:id.",
      inputSchema: { id: z.string().uuid().describe("Target workflow id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.WORKFLOWS.VIEW");
        const workflow = await workflowService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(workflow);
      } catch (err) {
        return mcpErrorResponse(err, "get_workflow failed");
      }
    },
  );

  registerTool(
    "create_workflow",
    {
      title: "Create workflow",
      description:
        "Create a workflow bound to a pipeline. Mirrors POST /workflows. Resolve pipelineId via list_pipelines first.",
      inputSchema: CreateWorkflowSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.WORKFLOWS.CREATE");
        const workflow = await workflowService.create(
          authCtx.tenantId,
          CreateWorkflowSchema.parse(dto) as CreateWorkflowDto,
        );
        return mcpJsonResponse(workflow);
      } catch (err) {
        return mcpErrorResponse(err, "create_workflow failed");
      }
    },
  );

  registerTool(
    "update_workflow",
    {
      title: "Update workflow",
      description:
        "Update a workflow's name, active flag, or rules (rules you send REPLACE existing ones). Mirrors PUT /workflows/:id. Fetch it first with get_workflow.",
      inputSchema: {
        id: z.string().uuid().describe("Target workflow id"),
        ...UpdateWorkflowSchema.shape,
      },
    },
    async (raw: { id: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "CRM.WORKFLOWS.UPDATE");
        const { id, ...rest } = raw;
        const dto = UpdateWorkflowSchema.parse(rest) as UpdateWorkflowDto;
        const workflow = await workflowService.update(
          authCtx.tenantId,
          id,
          dto,
        );
        return mcpJsonResponse(workflow);
      } catch (err) {
        return mcpErrorResponse(err, "update_workflow failed");
      }
    },
  );
}
