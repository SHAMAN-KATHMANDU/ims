import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  assertInsightsWindow,
  computeAppSecretProof,
  metaGraphGetAll,
  metaGraphRequest,
} from "./meta-graph.client";

interface FakeResponseInit {
  ok?: boolean;
  status?: number;
  headers?: Record<string, string>;
}

function fakeResponse(body: unknown, init: FakeResponseInit = {}) {
  const headers = init.headers ?? {};
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: "",
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("meta-graph.client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a versioned URL with access_token and appsecret_proof", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ id: "123", name: "Page" }));

    const out = await metaGraphRequest<{ id: string }>({
      path: "me",
      token: "TKN",
      appSecret: "SECRET",
      version: "v23.0",
      query: { fields: "id,name", empty: undefined },
    });

    expect(out).toEqual({ id: "123", name: "Page" });
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("https://graph.facebook.com/v23.0/me");
    expect(calledUrl).toContain("access_token=TKN");
    expect(calledUrl).toContain("fields=id%2Cname");
    expect(calledUrl).toContain(
      `appsecret_proof=${computeAppSecretProof("TKN", "SECRET")}`,
    );
    // undefined query values are dropped
    expect(calledUrl).not.toContain("empty=");
  });

  it("normalizes a Facebook error envelope and maps code 190 → 401", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse(
        {
          error: {
            message: "Invalid OAuth access token.",
            type: "OAuthException",
            code: 190,
            fbtrace_id: "ABC123",
          },
        },
        { ok: false, status: 400 },
      ),
    );

    await expect(
      metaGraphRequest({ path: "me", token: "bad", maxRetries: 0 }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "META_GRAPH_ERROR",
    });
  });

  it("retries transient error code 4 then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse(
          { error: { message: "rate limited", code: 4 } },
          { ok: false, status: 400 },
        ),
      )
      .mockResolvedValueOnce(fakeResponse({ ok: true }));

    const out = await metaGraphRequest<{ ok: boolean }>({
      path: "me",
      token: "t",
      maxRetries: 2,
    });

    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent error", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse(
        { error: { message: "bad field", code: 100 } },
        { ok: false, status: 400 },
      ),
    );

    await expect(
      metaGraphRequest({ path: "me", token: "t", maxRetries: 2 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("metaGraphGetAll follows paging.next and concatenates data", async () => {
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          data: [1, 2],
          paging: { next: "https://graph.facebook.com/v23.0/next?after=x" },
        }),
      )
      .mockResolvedValueOnce(fakeResponse({ data: [3], paging: {} }));

    const out = await metaGraphGetAll<number>({ path: "x/edge", token: "t" });
    expect(out.data).toEqual([1, 2, 3]);
    expect(out.pages).toBe(2);
    expect(out.truncated).toBe(false);
  });

  it("metaGraphGetAll reports truncation when maxPages is hit", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        data: [1],
        paging: { next: "https://graph.facebook.com/v23.0/next" },
      }),
    );

    const out = await metaGraphGetAll<number>(
      { path: "x/edge", token: "t" },
      2,
    );
    expect(out.pages).toBe(2);
    expect(out.truncated).toBe(true);
  });
});

describe("assertInsightsWindow", () => {
  it("allows a window within 90 days", () => {
    expect(() =>
      assertInsightsWindow("2026-01-01", "2026-02-01"),
    ).not.toThrow();
  });

  it("rejects a window wider than 90 days", () => {
    expect(() => assertInsightsWindow("2026-01-01", "2026-06-01")).toThrowError(
      /90-day/,
    );
  });

  it("is a no-op when either bound is missing", () => {
    expect(() => assertInsightsWindow(undefined, "2026-02-01")).not.toThrow();
    expect(() => assertInsightsWindow("2026-01-01", undefined)).not.toThrow();
  });
});
