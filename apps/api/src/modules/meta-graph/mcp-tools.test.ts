import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./meta-graph.client", () => ({
  metaGraphRequest: vi.fn().mockResolvedValue({ ok: true }),
  metaGraphGetAll: vi
    .fn()
    .mockResolvedValue({ data: [], pages: 1, truncated: false }),
  assertInsightsWindow: vi.fn(),
  DEFAULT_GRAPH_API_VERSION: "v23.0",
}));

vi.mock("./meta-graph.token-resolver", () => ({
  resolvePageToken: vi.fn().mockResolvedValue({
    token: "ptok",
    appSecret: "sec",
    version: "v23.0",
    externalId: "PAGE1",
    name: "Page",
  }),
  resolveAdsToken: vi.fn().mockResolvedValue({
    token: "atok",
    appSecret: "sec",
    version: "v23.0",
    externalId: "111",
    name: "Acct",
  }),
}));

vi.mock("@/modules/mcp/mcp.rbac", () => ({
  assertMcpPermission: vi.fn().mockResolvedValue(undefined),
  mcpJsonResponse: (d: unknown) => ({
    content: [{ type: "text", text: JSON.stringify(d) }],
  }),
  mcpErrorResponse: (_e: unknown, m: string) => ({
    isError: true,
    content: [{ type: "text", text: m }],
  }),
}));

vi.mock("@/modules/meta-integration/meta-integration.repository", () => ({
  default: { getCredentialsByKind: vi.fn().mockResolvedValue([]) },
}));

import { registerMetaGraphMcpTools } from "./mcp-tools";
import { metaGraphRequest } from "./meta-graph.client";
import { resolveAdsToken, resolvePageToken } from "./meta-graph.token-resolver";

const mockGraph = metaGraphRequest as unknown as ReturnType<typeof vi.fn>;
const mockPage = resolvePageToken as unknown as ReturnType<typeof vi.fn>;
const mockAds = resolveAdsToken as unknown as ReturnType<typeof vi.fn>;

type Tool = { handler: (args: any) => Promise<unknown> };

function buildTools() {
  const tools = new Map<string, Tool>();
  const server = {
    registerTool: (
      name: string,
      _config: unknown,
      handler: Tool["handler"],
    ) => {
      tools.set(name, { handler });
    },
  };
  registerMetaGraphMcpTools(server as any, {
    tenantId: "t1",
    tenantSlug: "demo",
    userId: "u1",
    userRole: "admin",
  });
  return tools;
}

describe("meta-graph mcp-tools", () => {
  let tools: Map<string, Tool>;
  beforeEach(() => {
    vi.clearAllMocks();
    mockGraph.mockResolvedValue({ ok: true });
    mockPage.mockResolvedValue({
      token: "ptok",
      appSecret: "sec",
      version: "v23.0",
      externalId: "PAGE1",
      name: "Page",
    });
    mockAds.mockResolvedValue({
      token: "atok",
      appSecret: "sec",
      version: "v23.0",
      externalId: "111",
      name: "Acct",
    });
    tools = buildTools();
  });

  it("registers the full tool surface (43+ tools)", () => {
    expect(tools.size).toBeGreaterThanOrEqual(43);
    for (const name of [
      "meta_graph_get",
      "meta_page_insights",
      "meta_post_get",
      "meta_campaign_get",
      "meta_ad_account_get",
      "meta_businesses_list",
    ]) {
      expect(tools.has(name)).toBe(true);
    }
  });

  it("page getter resolves the page token and builds the object path", async () => {
    await tools.get("meta_post_get")!.handler({ postId: "P_1" });
    expect(mockPage).toHaveBeenCalled();
    expect(mockAds).not.toHaveBeenCalled();
    const call = mockGraph.mock.calls[0][0];
    expect(call).toMatchObject({
      path: "P_1",
      token: "ptok",
      version: "v23.0",
    });
    expect(call.query.fields).toContain("reactions.summary(true)");
  });

  it("page edge getter uses the resolved externalId in the path", async () => {
    await tools.get("meta_page_feed")!.handler({});
    expect(mockGraph.mock.calls[0][0].path).toBe("PAGE1/feed");
  });

  it("ads getter resolves the ads token and prefixes act_ for account edges", async () => {
    await tools.get("meta_ad_account_get")!.handler({});
    expect(mockAds).toHaveBeenCalled();
    expect(mockPage).not.toHaveBeenCalled();
    const call = mockGraph.mock.calls[0][0];
    expect(call).toMatchObject({ path: "act_111", token: "atok" });
    expect(call.query.fields).toContain("amount_spent");
  });

  it("ads object getter uses the raw object id (no act_ prefix)", async () => {
    await tools.get("meta_campaign_get")!.handler({ campaignId: "C_9" });
    expect(mockGraph.mock.calls[0][0].path).toBe("C_9");
  });

  it("video insights defaults to current view metrics when none given", async () => {
    await tools.get("meta_video_insights")!.handler({ videoId: "V_1" });
    const call = mockGraph.mock.calls[0][0];
    expect(call.path).toBe("V_1/video_insights");
    expect(call.query.metric).toContain("total_video_views");
  });

  it("post reactions requests a total_count summary", async () => {
    await tools.get("meta_post_reactions")!.handler({ postId: "P_1" });
    expect(mockGraph.mock.calls[0][0].query.summary).toBe("total_count");
  });

  it("surfaces a structured error when the Graph call fails", async () => {
    mockGraph.mockRejectedValueOnce(new Error("boom"));
    const res: any = await tools.get("meta_campaign_get")!.handler({
      campaignId: "C_9",
    });
    expect(res.isError).toBe(true);
  });
});
