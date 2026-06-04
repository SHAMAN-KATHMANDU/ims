/**
 * MCP update/read tools — Tasks module.
 *
 * Mirrors PUT /tasks/:id, GET /tasks/:id, GET /tasks. update_task accepts
 * partial fields and runs the same reference validation as create
 * (contactId/memberId/dealId/companyId/assignedToId must exist).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import taskService from "@/modules/tasks/task.service";
import {
  UpdateTaskSchema,
  type UpdateTaskDto,
} from "@/modules/tasks/task.schema";

export function registerTasksUpdateMcpTools(
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
    "list_tasks",
    {
      title: "List tasks",
      description:
        "List CRM tasks for the tenant. Supports search and limit. Use to find a task id to update.",
      inputSchema: {
        search: z.string().optional().describe("Match task title"),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.TASKS.VIEW");
        const result = await taskService.getAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_tasks failed");
      }
    },
  );

  registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Fetch a single task by id. Use list_tasks to find the id.",
      inputSchema: { id: z.string().uuid().describe("Target task id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.TASKS.VIEW");
        const task = await taskService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(task);
      } catch (err) {
        return mcpErrorResponse(err, "get_task failed");
      }
    },
  );

  registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Update a task. Mirrors PUT /tasks/:id. Only provided fields change. " +
        "References validated: contactId/memberId/dealId/companyId/assignedToId must exist.",
      inputSchema: {
        id: z.string().uuid().describe("Target task id"),
        ...UpdateTaskSchema.shape,
      },
    },
    async (args: { id: string } & UpdateTaskDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.TASKS.UPDATE");
        const { id, ...data } = args;
        const task = await taskService.update(
          authCtx.tenantId,
          id,
          data as UpdateTaskDto,
        );
        return mcpJsonResponse(task);
      } catch (err) {
        return mcpErrorResponse(err, "update_task failed");
      }
    },
  );
}
