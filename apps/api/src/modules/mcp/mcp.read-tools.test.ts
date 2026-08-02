/**
 * RBAC + delegation tests for the Phase-2 read/update MCP tools (transfers,
 * sales, inventory, pipelines). Verifies the documented service argument
 * orders — findAll(tenantId, query) vs update(tenantId, id, data) vs
 * ambient-tenant calls — and the standard 403 denial shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  assertPermissionMock,
  transferServiceMock,
  saleServiceMock,
  inventoryServiceMock,
  pipelineServiceMock,
} = vi.hoisted(() => ({
  assertPermissionMock: vi.fn(),
  transferServiceMock: { findAll: vi.fn(), findById: vi.fn() },
  saleServiceMock: { getAllSales: vi.fn(), getSaleById: vi.fn() },
  inventoryServiceMock: {
    getProductStock: vi.fn(),
    getLocationInventory: vi.fn(),
  },
  pipelineServiceMock: { update: vi.fn() },
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

vi.mock("@/modules/transfers/transfer.service", () => ({
  default: transferServiceMock,
}));
vi.mock("@/modules/sales/sale.service", () => ({
  default: saleServiceMock,
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  default: inventoryServiceMock,
}));
vi.mock("@/modules/pipelines/pipeline.service", () => ({
  default: pipelineServiceMock,
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTransfersReadMcpTools } from "@/modules/transfers/mcp-tools-read";
import { registerSalesReadMcpTools } from "@/modules/sales/mcp-tools-read";
import { registerInventoryReadMcpTools } from "@/modules/inventory/mcp-tools-read";
import { registerPipelinesUpdateMcpTools } from "@/modules/pipelines/mcp-tools-update";
import type { McpAuthContext } from "./mcp.server";

const ctx: McpAuthContext = {
  tenantId: "tenant-1",
  tenantSlug: "demo",
  userId: "user-1",
  userRole: "STAFF",
};

const UUID = "00000000-0000-0000-0000-000000000001";

type TestServer = {
  _registeredTools: Record<
    string,
    { handler: (args: unknown) => Promise<unknown> | unknown }
  >;
};

function newServer(): TestServer {
  const s = new McpServer({ name: "test", version: "0.0.0" });
  registerTransfersReadMcpTools(s, ctx);
  registerSalesReadMcpTools(s, ctx);
  registerInventoryReadMcpTools(s, ctx);
  registerPipelinesUpdateMcpTools(s, ctx);
  return s as unknown as TestServer;
}

beforeEach(() => {
  assertPermissionMock.mockReset();
  for (const svc of [
    transferServiceMock,
    saleServiceMock,
    inventoryServiceMock,
    pipelineServiceMock,
  ]) {
    for (const fn of Object.values(svc)) fn.mockReset();
  }
});

describe("phase-2 tool registration", () => {
  it("registers all seven tools", () => {
    const server = newServer();
    for (const name of [
      "list_transfers",
      "get_transfer",
      "list_sales",
      "get_sale",
      "get_product_stock",
      "get_location_inventory",
      "update_pipeline",
    ]) {
      expect(
        server._registeredTools[name],
        `missing tool: ${name}`,
      ).toBeDefined();
    }
  });
});

describe("RBAC denial", () => {
  it("get_transfer returns isError + 403 and never calls the service", async () => {
    assertPermissionMock.mockRejectedValue(
      Object.assign(new Error("You do not have permission"), {
        statusCode: 403,
      }),
    );

    const server = newServer();
    const result = (await server._registeredTools["get_transfer"].handler({
      id: UUID,
    })) as { isError?: boolean; content: { text: string }[] };

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      statusCode: 403,
    });
    expect(transferServiceMock.findById).not.toHaveBeenCalled();
  });
});

describe("service delegation and argument order", () => {
  beforeEach(() => {
    assertPermissionMock.mockResolvedValue(undefined);
  });

  it("get_transfer → findById(tenantId, id)", async () => {
    transferServiceMock.findById.mockResolvedValue({ id: UUID });

    const server = newServer();
    await server._registeredTools["get_transfer"].handler({ id: UUID });

    expect(transferServiceMock.findById).toHaveBeenCalledWith("tenant-1", UUID);
  });

  it("list_sales forwards filters plus the caller's userRole", async () => {
    saleServiceMock.getAllSales.mockResolvedValue({ sales: [], total: 0 });

    const server = newServer();
    await server._registeredTools["list_sales"].handler({
      page: 2,
      limit: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(saleServiceMock.getAllSales).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        userRole: "STAFF",
      }),
    );
  });

  it("get_location_inventory → getLocationInventory(locationId, rawQuery)", async () => {
    inventoryServiceMock.getLocationInventory.mockResolvedValue({
      items: [],
    });

    const server = newServer();
    await server._registeredTools["get_location_inventory"].handler({
      locationId: UUID,
      search: "tee",
    });

    expect(inventoryServiceMock.getLocationInventory).toHaveBeenCalledWith(
      UUID,
      expect.objectContaining({ search: "tee" }),
    );
  });

  it("update_pipeline → update(tenantId, id, dto)", async () => {
    pipelineServiceMock.update.mockResolvedValue({ id: UUID, name: "Sales" });

    const server = newServer();
    await server._registeredTools["update_pipeline"].handler({
      id: UUID,
      name: "Sales",
    });

    expect(pipelineServiceMock.update).toHaveBeenCalledWith(
      "tenant-1",
      UUID,
      expect.objectContaining({ name: "Sales" }),
    );
  });
});
