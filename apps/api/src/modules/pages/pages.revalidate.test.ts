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

import { revalidatePages } from "./pages.revalidate";

describe("revalidatePages", () => {
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

  it("sends pages + site tags when no slug given", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await revalidatePages("t1");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tags).toEqual(["tenant:t1:pages", "tenant:t1:site"]);
  });

  it("adds slug tag when provided", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await revalidatePages("t1", { slug: "about" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tags).toContain("tenant:t1:page:about");
  });

  it("no-ops when baseUrl unset", async () => {
    mockEnv.tenantSiteInternalUrl = "";
    await revalidatePages("t1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows network errors", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    await expect(revalidatePages("t1")).resolves.toBeUndefined();
  });

  it("swallows non-2xx", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(revalidatePages("t1")).resolves.toBeUndefined();
  });
});
