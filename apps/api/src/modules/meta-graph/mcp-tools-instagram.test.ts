import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./meta-graph.client", () => ({
  metaGraphRequest: vi.fn().mockResolvedValue({ ok: true }),
  assertInsightsWindow: vi.fn(),
}));

vi.mock("./meta-graph.token-resolver", () => ({
  resolveInstagramAccount: vi.fn().mockResolvedValue({
    token: "ptok",
    appSecret: "sec",
    version: "v23.0",
    igUserId: "IG1",
    igUsername: "acct",
    pageId: "PAGE1",
    name: "Page",
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

import { registerInstagramMcpTools } from "./mcp-tools-instagram";
import { metaGraphRequest, assertInsightsWindow } from "./meta-graph.client";
import { resolveInstagramAccount } from "./meta-graph.token-resolver";
import metaIntegrationRepository from "@/modules/meta-integration/meta-integration.repository";

const mockGraph = metaGraphRequest as unknown as ReturnType<typeof vi.fn>;
const mockResolve = resolveInstagramAccount as unknown as ReturnType<
  typeof vi.fn
>;
const mockWindow = assertInsightsWindow as unknown as ReturnType<typeof vi.fn>;
const mockRepo = metaIntegrationRepository as unknown as {
  getCredentialsByKind: ReturnType<typeof vi.fn>;
};

type Tool = { handler: (args: any) => Promise<unknown> };

function buildTools() {
  const tools = new Map<string, Tool>();
  const server = {
    registerTool: (name: string, _c: unknown, handler: Tool["handler"]) => {
      tools.set(name, { handler });
    },
  };
  registerInstagramMcpTools(server as any, {
    tenantId: "t1",
    tenantSlug: "demo",
    userId: "u1",
    userRole: "admin",
  });
  return tools;
}

describe("instagram mcp-tools", () => {
  let tools: Map<string, Tool>;
  beforeEach(() => {
    vi.clearAllMocks();
    mockGraph.mockResolvedValue({ ok: true });
    mockResolve.mockResolvedValue({
      token: "ptok",
      appSecret: "sec",
      version: "v23.0",
      igUserId: "IG1",
      igUsername: "acct",
      pageId: "PAGE1",
      name: "Page",
    });
    tools = buildTools();
  });

  it("registers the IG tool surface", () => {
    for (const name of [
      "meta_ig_list",
      "meta_ig_account_get",
      "meta_ig_account_insights",
      "meta_ig_media_list",
      "meta_ig_media_insights",
      "meta_ig_conversations",
      "meta_ig_hashtag_search",
    ]) {
      expect(tools.has(name)).toBe(true);
    }
    expect(tools.size).toBeGreaterThanOrEqual(13);
  });

  it("account getter resolves the IG account into the path", async () => {
    await tools.get("meta_ig_account_get")!.handler({});
    expect(mockResolve).toHaveBeenCalledWith("t1", {
      pageId: undefined,
      igUserId: undefined,
    });
    const call = mockGraph.mock.calls[0][0];
    expect(call).toMatchObject({
      path: "IG1",
      token: "ptok",
      version: "v23.0",
    });
    expect(call.query.fields).toContain("followers_count");
  });

  it("account insights default to current `views` (not impressions) and guard the window", async () => {
    await tools.get("meta_ig_account_insights")!.handler({});
    const call = mockGraph.mock.calls[0][0];
    expect(call.path).toBe("IG1/insights");
    expect(call.query.metric).toContain("views");
    expect(call.query.metric).not.toContain("impressions");
    expect(mockWindow).toHaveBeenCalled();
  });

  it("media insights target the media id and default the metric set", async () => {
    await tools.get("meta_ig_media_insights")!.handler({ mediaId: "M9" });
    const call = mockGraph.mock.calls[0][0];
    expect(call.path).toBe("M9/insights");
    expect(call.query.metric).toContain("reach");
  });

  it("DM conversations use the linked Page id with platform=instagram", async () => {
    await tools.get("meta_ig_conversations")!.handler({});
    const call = mockGraph.mock.calls[0][0];
    expect(call.path).toBe("PAGE1/conversations");
    expect(call.query.platform).toBe("instagram");
  });

  it("meta_ig_list reports linked IG accounts from stored metadata", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValueOnce([
      {
        externalId: "PAGE1",
        name: "Page One",
        metadata: { instagram: { id: "IG1", username: "acct" } },
      },
      { externalId: "PAGE2", name: "Page Two", metadata: {} },
    ]);
    const res: any = await tools.get("meta_ig_list")!.handler({});
    const rows = JSON.parse(res.content[0].text);
    expect(rows).toEqual([
      {
        pageId: "PAGE1",
        pageName: "Page One",
        igUserId: "IG1",
        igUsername: "acct",
      },
      {
        pageId: "PAGE2",
        pageName: "Page Two",
        igUserId: null,
        igUsername: null,
      },
    ]);
  });

  it("surfaces a structured error when resolution fails", async () => {
    mockResolve.mockRejectedValueOnce(new Error("no IG"));
    const res: any = await tools.get("meta_ig_account_get")!.handler({});
    expect(res.isError).toBe(true);
  });
});
