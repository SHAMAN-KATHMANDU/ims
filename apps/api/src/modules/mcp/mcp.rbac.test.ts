/**
 * Verifies the MCP RBAC helper actually delegates to assertPermission with
 * the correct args and that the error envelope produced by mcpErrorResponse
 * surfaces the AppError statusCode/message untouched.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { assertPermissionMock } = vi.hoisted(() => ({
  assertPermissionMock: vi.fn(),
}));

vi.mock("@/middlewares/requirePermission", () => ({
  assertPermission: assertPermissionMock,
}));

import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "./mcp.rbac";
import type { McpAuthContext } from "./mcp.server";

const ctx: McpAuthContext = {
  tenantId: "tenant-1",
  tenantSlug: "demo",
  userId: "user-1",
  userRole: "STAFF",
};

describe("assertMcpPermission", () => {
  beforeEach(() => {
    assertPermissionMock.mockReset();
  });

  it("forwards tenantId, userId, key, and resourceId=tenantId", async () => {
    assertPermissionMock.mockResolvedValue(undefined);
    await assertMcpPermission(ctx, "INVENTORY.PRODUCTS.CREATE");
    expect(assertPermissionMock).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "INVENTORY.PRODUCTS.CREATE",
      "tenant-1",
    );
  });

  it("propagates AppError(403) from assertPermission", async () => {
    const err = Object.assign(new Error("You do not have permission"), {
      statusCode: 403,
    });
    assertPermissionMock.mockRejectedValue(err);
    await expect(
      assertMcpPermission(ctx, "SETTINGS.MEMBERS.CREATE"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("mcpErrorResponse", () => {
  it("preserves statusCode + message from the thrown error", () => {
    const err = Object.assign(new Error("Forbidden"), { statusCode: 403 });
    const env = mcpErrorResponse(err, "fallback");
    expect(env.isError).toBe(true);
    const parsed = JSON.parse(env.content[0].text);
    expect(parsed).toEqual({ error: "Forbidden", statusCode: 403 });
  });

  it("falls back to a 500 + message when the error has no fields", () => {
    const env = mcpErrorResponse({}, "create_foo failed");
    const parsed = JSON.parse(env.content[0].text);
    expect(parsed).toEqual({ error: "create_foo failed", statusCode: 500 });
  });
});

describe("mcpJsonResponse", () => {
  it("wraps data in the MCP content envelope", () => {
    const env = mcpJsonResponse({ ok: true, id: "x" });
    expect(env.content[0].type).toBe("text");
    expect(JSON.parse(env.content[0].text)).toEqual({ ok: true, id: "x" });
  });
});
