/**
 * RBAC helpers for MCP tool handlers.
 *
 * MCP tools are not in the Express middleware stack, so they can't use
 * `requirePermission()`. Instead they call `assertMcpPermission(authCtx, key)`
 * which wraps the same `assertPermission()` primitive the HTTP middleware uses
 * — workspace-scoped permissions resolve with resourceId === tenantId.
 *
 * Errors propagate as AppError(403) with `statusCode === 403`; tool handlers
 * catch them and return `{ isError: true, content: [...] }` matching the
 * pattern in `create_sale`.
 */

import { assertPermission } from "@/middlewares/requirePermission";
import type { McpAuthContext } from "./mcp.server";

export async function assertMcpPermission(
  ctx: McpAuthContext,
  permissionKey: string,
): Promise<void> {
  await assertPermission(ctx.tenantId, ctx.userId, permissionKey, ctx.tenantId);
}

export function mcpErrorResponse(err: unknown, fallbackMessage: string) {
  const e = err as { statusCode?: number; message?: string };
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: e?.message ?? fallbackMessage,
          statusCode: e?.statusCode ?? 500,
        }),
      },
    ],
  };
}

export function mcpJsonResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}
