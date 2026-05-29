/**
 * Tool-level RBAC integration test: when assertPermission throws AppError(403),
 * the MCP tool handler returns { isError: true, content: [{ statusCode: 403 }] }
 * — proving the wrapper produces the same denial shape the audit predicted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { assertPermissionMock, productCreateMock } = vi.hoisted(() => ({
  assertPermissionMock: vi.fn(),
  productCreateMock: vi.fn(),
}));

vi.mock("@/middlewares/requirePermission", () => ({
  assertPermission: assertPermissionMock,
}));

vi.mock("@/config/redis", () => {
  const fake = {
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    default: fake,
    redis: fake,
    getRedis: () => fake,
    createRedisClient: () => fake,
  };
});

vi.mock("@/config/prisma", () => {
  const fakePrisma = new Proxy(
    {},
    {
      get: () =>
        new Proxy(
          {},
          {
            get: () => vi.fn(),
          },
        ),
    },
  );
  return {
    default: fakePrisma,
    basePrisma: fakePrisma,
    runWithTenant: <T>(_t: string, fn: () => T) => fn(),
  };
});

vi.mock("@/middlewares/enforcePlanLimits", () => ({
  assertPlanLimitByTenantId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/products/product.service", () => ({
  default: {
    create: productCreateMock,
    createTag: vi.fn(),
    createDiscountType: vi.fn(),
  },
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProductsCreateMcpTools } from "@/modules/products/mcp-tools-create";
import type { McpAuthContext } from "./mcp.server";

const ctx: McpAuthContext = {
  tenantId: "tenant-1",
  tenantSlug: "demo",
  userId: "user-1",
  userRole: "STAFF",
};

function newServer(): McpServer & {
  _registeredTools: Record<
    string,
    { handler: (args: unknown) => Promise<unknown> | unknown }
  >;
} {
  const s = new McpServer({ name: "test", version: "0.0.0" });
  registerProductsCreateMcpTools(s, ctx);
  return s as unknown as McpServer & {
    _registeredTools: Record<
      string,
      { handler: (args: unknown) => Promise<unknown> | unknown }
    >;
  };
}

describe("create_product RBAC integration", () => {
  beforeEach(() => {
    assertPermissionMock.mockReset();
    productCreateMock.mockReset();
  });

  it("returns isError: true + statusCode 403 when permission is denied", async () => {
    assertPermissionMock.mockRejectedValue(
      Object.assign(new Error("You do not have permission"), {
        statusCode: 403,
      }),
    );

    const server = newServer();
    const tool = server._registeredTools["create_product"];
    expect(tool).toBeDefined();

    const result = (await tool.handler({
      name: "Denied Product",
      categoryId: "00000000-0000-0000-0000-000000000000",
      costPrice: 10,
      mrp: 20,
      variations: [{ stockQuantity: 1 }],
    })) as { isError?: boolean; content: { text: string }[] };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ statusCode: 403 });
    // Service must NOT have been called when permission denied.
    expect(productCreateMock).not.toHaveBeenCalled();
  });

  it("delegates to productService.create when permission passes", async () => {
    assertPermissionMock.mockResolvedValue(undefined);
    productCreateMock.mockResolvedValue({
      id: "prod-1",
      name: "Allowed Product",
    });

    const server = newServer();
    const tool = server._registeredTools["create_product"];
    const result = (await tool.handler({
      name: "Allowed Product",
      categoryId: "00000000-0000-0000-0000-000000000000",
      costPrice: 10,
      mrp: 20,
      variations: [{ stockQuantity: 1 }],
    })) as { isError?: boolean; content: { text: string }[] };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ id: "prod-1", name: "Allowed Product" });
    expect(productCreateMock).toHaveBeenCalledTimes(1);
  });
});
