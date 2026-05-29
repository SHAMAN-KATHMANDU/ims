/**
 * Smoke test for MCP server tool registration. Mocks the heavy infra modules
 * (redis, prisma) so we can instantiate createMcpServer in a unit-test sandbox
 * and assert every expected tool name is registered.
 */

import { describe, it, expect, vi } from "vitest";

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

import { createMcpServer, type McpAuthContext } from "./mcp.server";

const EXPECTED_CREATE_TOOLS = [
  "create_product",
  "create_product_tag",
  "create_discount_type",
  "create_contact",
  "create_contact_tag",
  "add_contact_note",
  "add_contact_communication",
  "create_deal",
  "add_deal_line_item",
  "convert_deal_to_sale",
  "create_activity",
  "create_task",
  "complete_task",
  "adjust_inventory",
  "set_inventory",
  "create_sale",
  "preview_sale",
  "add_sale_payment",
  "create_company",
  "create_vendor",
  "create_location",
  "create_lead",
  "convert_lead",
  "assign_lead",
  "create_category",
  "create_subcategory",
  "create_bundle",
  "create_transfer",
  "create_promo",
  "create_member",
  "create_pipeline",
  "seed_pipeline_framework",
  "create_automation_definition",
  "create_blog_post",
  "publish_blog_post",
  "unpublish_blog_post",
  "create_page",
  "publish_page",
  "unpublish_page",
  "presign_media_upload",
  "register_media_asset",
];

const EXPECTED_READ_TOOLS_SAMPLE = [
  "list_products",
  "list_contacts",
  "list_deals",
  "sales_daily_breakdown",
  "inventory_snapshot",
  "crm_staff_activity",
  "report_render",
];

describe("createMcpServer", () => {
  const authCtx: McpAuthContext = {
    tenantId: "00000000-0000-0000-0000-000000000000",
    tenantSlug: "smoke",
    userId: "00000000-0000-0000-0000-000000000001",
    userRole: "TENANT_ADMIN",
  };

  const server = createMcpServer(authCtx);
  const registered = (
    server as unknown as {
      _registeredTools: Record<string, unknown>;
    }
  )._registeredTools;
  const names = Object.keys(registered).sort();

  it("registers every expected create tool", () => {
    for (const name of EXPECTED_CREATE_TOOLS) {
      expect(names, `missing tool: ${name}`).toContain(name);
    }
  });

  it("keeps the existing read/analytics tools registered", () => {
    for (const name of EXPECTED_READ_TOOLS_SAMPLE) {
      expect(names, `missing read tool: ${name}`).toContain(name);
    }
  });

  it("registers no duplicate tool names", () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it("registers at least 47 tools total (38 create + ~18 read)", () => {
    expect(names.length).toBeGreaterThanOrEqual(47);
  });

  it("dumps the full sorted tool list (for visibility)", () => {
    // Not really an assertion — this just keeps the registered list visible
    // in test output for future audits.
    console.log("Registered MCP tools (" + names.length + "):");
    for (const n of names) console.log("  " + n);
    expect(names.length).toBeGreaterThan(0);
  });
});
