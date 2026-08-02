/**
 * RBAC + delegation tests for the attribute-types MCP tools, mirroring
 * modules/mcp/mcp.tool-rbac.test.ts: denied permission returns
 * { isError: true, statusCode: 403 } without touching the service; allowed
 * calls delegate to the service with the documented argument order.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { assertPermissionMock, serviceMock } = vi.hoisted(() => ({
  assertPermissionMock: vi.fn(),
  serviceMock: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listValues: vi.fn(),
    createValue: vi.fn(),
    updateValue: vi.fn(),
    getValueUsage: vi.fn(),
  },
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

vi.mock("@/modules/attribute-types/attribute-type.service", () => ({
  default: serviceMock,
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAttributeTypesCreateMcpTools } from "@/modules/attribute-types/mcp-tools-create";
import { registerAttributeTypesReadMcpTools } from "@/modules/attribute-types/mcp-tools-read";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";

const ctx: McpAuthContext = {
  tenantId: "tenant-1",
  tenantSlug: "demo",
  userId: "user-1",
  userRole: "STAFF",
};

const TYPE_ID = "00000000-0000-0000-0000-00000000000a";
const VALUE_ID = "00000000-0000-0000-0000-00000000000b";

type TestServer = {
  _registeredTools: Record<
    string,
    { handler: (args: unknown) => Promise<unknown> | unknown }
  >;
};

function newServer(): TestServer {
  const s = new McpServer({ name: "test", version: "0.0.0" });
  registerAttributeTypesCreateMcpTools(s, ctx);
  registerAttributeTypesReadMcpTools(s, ctx);
  return s as unknown as TestServer;
}

beforeEach(() => {
  assertPermissionMock.mockReset();
  for (const fn of Object.values(serviceMock)) fn.mockReset();
});

describe("attribute-types MCP tools registration", () => {
  it("registers all eight tools", () => {
    const server = newServer();
    for (const name of [
      "create_attribute_type",
      "create_attribute_value",
      "list_attribute_types",
      "get_attribute_type",
      "update_attribute_type",
      "list_attribute_values",
      "update_attribute_value",
      "get_attribute_value_usage",
    ]) {
      expect(
        server._registeredTools[name],
        `missing tool: ${name}`,
      ).toBeDefined();
    }
  });
});

describe("create_attribute_type RBAC integration", () => {
  it("returns isError: true + statusCode 403 when permission is denied", async () => {
    assertPermissionMock.mockRejectedValue(
      Object.assign(new Error("You do not have permission"), {
        statusCode: 403,
      }),
    );

    const server = newServer();
    const result = (await server._registeredTools[
      "create_attribute_type"
    ].handler({ name: "Size" })) as {
      isError?: boolean;
      content: { text: string }[];
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ statusCode: 403 });
    expect(serviceMock.create).not.toHaveBeenCalled();
  });

  it("delegates to attributeTypeService.create when permission passes", async () => {
    assertPermissionMock.mockResolvedValue(undefined);
    serviceMock.create.mockResolvedValue({
      id: TYPE_ID,
      name: "Size",
      code: "size",
    });

    const server = newServer();
    const result = (await server._registeredTools[
      "create_attribute_type"
    ].handler({ name: "Size" })) as {
      isError?: boolean;
      content: { text: string }[];
    };

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ name: "Size" });
    expect(serviceMock.create).toHaveBeenCalledWith("tenant-1", {
      name: "Size",
    });
  });
});

describe("value tools delegate with the service's argument order", () => {
  beforeEach(() => {
    assertPermissionMock.mockResolvedValue(undefined);
  });

  it("create_attribute_value → createValue(typeId, tenantId, data)", async () => {
    serviceMock.createValue.mockResolvedValue({ id: VALUE_ID, value: "XL" });

    const server = newServer();
    await server._registeredTools["create_attribute_value"].handler({
      typeId: TYPE_ID,
      value: "XL",
    });

    expect(serviceMock.createValue).toHaveBeenCalledWith(TYPE_ID, "tenant-1", {
      value: "XL",
    });
  });

  it("update_attribute_value → updateValue(typeId, valueId, tenantId, data)", async () => {
    serviceMock.updateValue.mockResolvedValue({ id: VALUE_ID, value: "XXL" });

    const server = newServer();
    await server._registeredTools["update_attribute_value"].handler({
      typeId: TYPE_ID,
      valueId: VALUE_ID,
      value: "XXL",
    });

    expect(serviceMock.updateValue).toHaveBeenCalledWith(
      TYPE_ID,
      VALUE_ID,
      "tenant-1",
      { value: "XXL" },
    );
  });

  it("get_attribute_value_usage → getValueUsage(typeId, valueId, tenantId)", async () => {
    serviceMock.getValueUsage.mockResolvedValue({
      variationCount: 2,
      productCount: 1,
    });

    const server = newServer();
    const result = (await server._registeredTools[
      "get_attribute_value_usage"
    ].handler({ typeId: TYPE_ID, valueId: VALUE_ID })) as {
      content: { text: string }[];
    };

    expect(serviceMock.getValueUsage).toHaveBeenCalledWith(
      TYPE_ID,
      VALUE_ID,
      "tenant-1",
    );
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      variationCount: 2,
    });
  });
});
