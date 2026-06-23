import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/meta-integration/meta-integration.repository", () => ({
  default: {
    getIntegration: vi.fn(),
    getCredentialsByKind: vi.fn(),
  },
}));

vi.mock("@/utils/encryption", () => ({
  decrypt: vi.fn((v: string) => `dec(${v})`),
  encrypt: vi.fn((v: string) => `enc(${v})`),
}));

import repo from "@/modules/meta-integration/meta-integration.repository";
import { resolveAdsToken, resolvePageToken } from "./meta-graph.token-resolver";

const mockRepo = repo as unknown as {
  getIntegration: ReturnType<typeof vi.fn>;
  getCredentialsByKind: ReturnType<typeof vi.fn>;
};

const cred = (externalId: string, name: string) => ({
  id: `id-${externalId}`,
  externalId,
  name,
  accessTokenEnc: `tok-${externalId}`,
});

describe("token-resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getIntegration.mockResolvedValue({
      appSecretEnc: "appsec",
      graphApiVersion: "v23.0",
      defaultPageId: null,
      defaultAdAccountId: null,
    });
  });

  it("throws META_NOT_CONFIGURED when no page credential exists", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValue([]);
    await expect(resolvePageToken("t1")).rejects.toMatchObject({
      code: "META_NOT_CONFIGURED",
      statusCode: 400,
    });
  });

  it("resolves the single connected page and decrypts token + appSecret", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValue([cred("PAGE1", "My Page")]);
    const out = await resolvePageToken("t1");
    expect(out).toMatchObject({
      token: "dec(tok-PAGE1)",
      appSecret: "dec(appsec)",
      version: "v23.0",
      externalId: "PAGE1",
      name: "My Page",
    });
  });

  it("throws availableOptions when multiple pages and no selector/default", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValue([
      cred("PAGE1", "A"),
      cred("PAGE2", "B"),
    ]);
    await expect(resolvePageToken("t1")).rejects.toMatchObject({
      code: "META_AMBIGUOUS_SELECTOR",
      availableOptions: [
        { id: "PAGE1", name: "A" },
        { id: "PAGE2", name: "B" },
      ],
    });
  });

  it("selects by pageId when provided", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValue([
      cred("PAGE1", "A"),
      cred("PAGE2", "B"),
    ]);
    const out = await resolvePageToken("t1", { pageId: "PAGE2" });
    expect(out.externalId).toBe("PAGE2");
  });

  it("throws availableOptions when pageId does not match", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValue([cred("PAGE1", "A")]);
    await expect(
      resolvePageToken("t1", { pageId: "NOPE" }),
    ).rejects.toMatchObject({ code: "META_AMBIGUOUS_SELECTOR" });
  });

  it("falls back to the configured default page", async () => {
    mockRepo.getIntegration.mockResolvedValue({
      appSecretEnc: null,
      graphApiVersion: null,
      defaultPageId: "PAGE2",
    });
    mockRepo.getCredentialsByKind.mockResolvedValue([
      cred("PAGE1", "A"),
      cred("PAGE2", "B"),
    ]);
    const out = await resolvePageToken("t1");
    expect(out.externalId).toBe("PAGE2");
    expect(out.appSecret).toBeUndefined();
    expect(out.version).toBe("v23.0"); // default when integration has none
  });

  it("strips the act_ prefix when selecting an ad account", async () => {
    mockRepo.getCredentialsByKind.mockResolvedValue([
      cred("111", "Acct A"),
      cred("222", "Acct B"),
    ]);
    const out = await resolveAdsToken("t1", { adAccountId: "act_222" });
    expect(out.externalId).toBe("222");
    expect(out.token).toBe("dec(tok-222)");
  });
});
