import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    tenantSiteInternalUrl: "http://dev_tenant_site:3100",
    revalidateSecret: "secret",
  },
}));

vi.mock("@/config/env", () => ({ env: mockEnv }));
vi.mock("@/config/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { revalidateBlog } from "./blog.revalidate";

describe("revalidateBlog", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockEnv.tenantSiteInternalUrl = "http://dev_tenant_site:3100";
    mockEnv.revalidateSecret = "secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends tenant + site tags when no slug given", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await revalidateBlog("t1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tags).toEqual(["tenant:t1:blog", "tenant:t1:site"]);
  });

  it("adds slug tag when provided", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await revalidateBlog("t1", { slug: "welcome" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tags).toContain("tenant:t1:blog:welcome");
  });

  it("no-ops when tenantSiteInternalUrl is unset", async () => {
    mockEnv.tenantSiteInternalUrl = "";
    await revalidateBlog("t1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows fetch failures silently", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    await expect(revalidateBlog("t1")).resolves.toBeUndefined();
  });

  it("swallows non-2xx responses", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(revalidateBlog("t1")).resolves.toBeUndefined();
  });
});
