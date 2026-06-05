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
  const e = err as {
    statusCode?: number;
    message?: string;
    code?: string;
    referenceKind?: string;
    availableOptions?: Array<{ id: string; name: string }>;
  };
  // Reference-validation failures carry the list of valid options so the AI can
  // surface them to the user, then create the missing lookup (after confirming)
  // and retry — see shared/validation/reference-validator.ts.
  const body: Record<string, unknown> = {
    error: e?.message ?? fallbackMessage,
    statusCode: e?.statusCode ?? 500,
  };
  if (e?.code) body.code = e.code;
  if (e?.referenceKind) body.referenceKind = e.referenceKind;
  if (Array.isArray(e?.availableOptions)) {
    body.availableOptions = e.availableOptions.map((o) => o.name);
    body.hint =
      "Pick one of availableOptions, or confirm with the user and call the matching create_* tool to add the value, then retry.";
  }
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  };
}

export function mcpJsonResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}
