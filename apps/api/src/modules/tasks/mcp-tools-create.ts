/**
 * MCP Create Tools — Tasks Module
 *
 * Mirrors POST /tasks and POST /tasks/:id/complete.
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
  CreateTaskSchema,
  type CreateTaskDto,
} from "@/modules/tasks/task.schema";

export function registerTasksCreateMcpTools(
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
    "create_task",
    {
      title: "Create task",
      description:
        "Create a CRM task with optional due date, priority, and assignment. Mirrors POST /tasks.",
      inputSchema: CreateTaskSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.TASKS.CREATE");
        const task = await taskService.create(
          authCtx.tenantId,
          dto as CreateTaskDto,
          authCtx.userId,
        );
        return mcpJsonResponse(task);
      } catch (err) {
        return mcpErrorResponse(err, "create_task failed");
      }
    },
  );

  registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Mark a task as DONE. Mirrors POST /tasks/:id/complete.",
      inputSchema: {
        taskId: z.string().uuid().describe("Task id to complete"),
      },
    },
    async ({ taskId }: { taskId: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.TASKS.UPDATE");
        const task = await taskService.complete(
          authCtx.tenantId,
          taskId,
          authCtx.userId,
        );
        return mcpJsonResponse(task);
      } catch (err) {
        return mcpErrorResponse(err, "complete_task failed");
      }
    },
  );
}
