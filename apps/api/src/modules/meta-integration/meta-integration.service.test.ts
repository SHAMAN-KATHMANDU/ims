import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./meta-integration.repository", () => ({
  default: {
    getIntegration: vi.fn(),
    ensureIntegration: vi.fn(),
    upsertIntegration: vi.fn(),
    upsertCredential: vi.fn(),
    deleteCredential: vi.fn(),
    getCredentialsByKind: vi.fn(),
  },
}));

vi.mock("@/utils/encryption", () => ({
  encrypt: vi.fn((v: string) => `enc(${v})`),
  decrypt: vi.fn((v: string) => `dec(${v})`),
}));

vi.mock("@/modules/meta-graph/meta-graph.client", () => ({
  DEFAULT_GRAPH_API_VERSION: "v23.0",
  metaGraphRequest: vi.fn(),
}));

vi.mock("@/modules/messaging-channels/messaging-channel.repository", () => ({
  default: {
    findAll: vi.fn(),
    findByExternalId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    disconnect: vi.fn(),
  },
}));

import repo from "./meta-integration.repository";
import channelRepo from "@/modules/messaging-channels/messaging-channel.repository";
import { metaGraphRequest } from "@/modules/meta-graph/meta-graph.client";
import service from "./meta-integration.service";

const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockChannelRepo = channelRepo as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;
const mockGraph = metaGraphRequest as unknown as ReturnType<typeof vi.fn>;

const integrationWith = (over: Record<string, unknown> = {}) => ({
  id: "int1",
  tenantId: "t1",
  appId: "APPID",
  appSecretEnc: "encsecret",
  graphApiVersion: null,
  defaultPageId: null,
  defaultAdAccountId: null,
  webhookVerifyToken: "wvt",
  credentials: [],
  ...over,
});

describe("MetaIntegrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no linked inbox channels; PAGE add creates a fresh channel.
    mockChannelRepo.findAll.mockResolvedValue([]);
    mockChannelRepo.findByExternalId.mockResolvedValue(null);
    mockChannelRepo.create.mockResolvedValue({ id: "ch1" });
    mockChannelRepo.update.mockResolvedValue({ id: "ch1" });
  });

  describe("getSummary", () => {
    it("lazily provisions a row + app-level verify token for a fresh tenant", async () => {
      // First lookup: no row. After ensureIntegration, a bare tokened row.
      mockRepo.getIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValue(
          integrationWith({ appId: null, appSecretEnc: null }),
        );
      mockRepo.ensureIntegration.mockResolvedValue(integrationWith());
      const out = await service.getSummary("t1");
      expect(out).toMatchObject({
        configured: false, // no app id/secret/credentials yet
        appId: null,
        hasAppSecret: false,
        graphApiVersion: "v23.0",
        credentials: [],
      });
      expect(out.webhook.verifyToken).toBe("wvt");
    });

    it("masks secrets — never leaks the encrypted app secret or token", async () => {
      mockRepo.getIntegration.mockResolvedValue(
        integrationWith({
          credentials: [
            {
              id: "c1",
              kind: "PAGE",
              externalId: "PAGE1",
              name: "My Page",
              accessTokenEnc: "enctoken",
              status: "ACTIVE",
              metadata: {},
              createdAt: new Date(0),
              updatedAt: new Date(0),
            },
          ],
        }),
      );
      const out = await service.getSummary("t1");
      expect(out.hasAppSecret).toBe(true);
      expect(out.appId).toBe("APPID");
      expect(out.credentials[0]).toMatchObject({
        id: "c1",
        kind: "PAGE",
        externalId: "PAGE1",
        tokenConfigured: true,
      });
      const serialized = JSON.stringify(out);
      expect(serialized).not.toContain("encsecret");
      expect(serialized).not.toContain("enctoken");
      expect(serialized).not.toContain("accessTokenEnc");
    });
  });

  describe("upsertAppCredentials", () => {
    beforeEach(() => {
      mockRepo.getIntegration.mockResolvedValue(integrationWith());
    });

    it("encrypts a provided app secret", async () => {
      await service.upsertAppCredentials("t1", { appId: "A", appSecret: "S" });
      expect(mockRepo.upsertIntegration).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ appId: "A", appSecretEnc: "enc(S)" }),
      );
    });

    it("clears the app secret when given an empty string", async () => {
      await service.upsertAppCredentials("t1", { appSecret: "" });
      expect(mockRepo.upsertIntegration).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ appSecretEnc: null }),
      );
    });

    it("leaves the app secret untouched when omitted", async () => {
      await service.upsertAppCredentials("t1", { appId: "A" });
      const data = mockRepo.upsertIntegration.mock.calls[0][1];
      expect(data).not.toHaveProperty("appSecretEnc");
    });
  });

  describe("addCredential", () => {
    beforeEach(() => {
      mockRepo.ensureIntegration.mockResolvedValue(
        integrationWith({ appSecretEnc: null }),
      );
      mockRepo.getIntegration.mockResolvedValue(integrationWith());
    });

    it("validates a PAGE token via /me, then encrypts and stores it", async () => {
      mockGraph.mockResolvedValue({ id: "PAGE1", name: "My Page" });
      await service.addCredential("t1", {
        kind: "PAGE",
        externalId: "PAGE1",
        name: "My Page",
        accessToken: "TOKEN",
      });
      expect(mockGraph).toHaveBeenCalledWith(
        expect.objectContaining({ path: "me" }),
      );
      expect(mockRepo.upsertCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "PAGE",
          externalId: "PAGE1",
          accessTokenEnc: "enc(TOKEN)",
        }),
      );
      // PAGE tokens also provision an inbox MessagingChannel for webhooks.
      expect(mockChannelRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "FACEBOOK_MESSENGER",
          externalId: "PAGE1",
        }),
      );
    });

    it("validates an ADS token via /me/adaccounts and strips act_ from the id", async () => {
      mockGraph.mockResolvedValue({ data: [{ id: "act_123" }] });
      await service.addCredential("t1", {
        kind: "ADS",
        externalId: "act_123",
        name: "Acct",
        accessToken: "TOKEN",
      });
      expect(mockGraph).toHaveBeenCalledWith(
        expect.objectContaining({ path: "me/adaccounts" }),
      );
      expect(mockRepo.upsertCredential).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "ADS", externalId: "123" }),
      );
    });

    it("rejects (and stores nothing) when the page belongs to another workspace", async () => {
      mockGraph.mockResolvedValue({ id: "PAGE1", name: "My Page" });
      mockChannelRepo.findByExternalId.mockResolvedValue({
        id: "ch-other",
        tenantId: "other-tenant",
      });
      await expect(
        service.addCredential("t1", {
          kind: "PAGE",
          externalId: "PAGE1",
          name: "My Page",
          accessToken: "TOKEN",
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockRepo.upsertCredential).not.toHaveBeenCalled();
      expect(mockChannelRepo.create).not.toHaveBeenCalled();
    });

    it("does not store anything when the token is invalid", async () => {
      mockGraph.mockRejectedValue(new Error("Invalid OAuth access token."));
      await expect(
        service.addCredential("t1", {
          kind: "PAGE",
          externalId: "PAGE1",
          name: "x",
          accessToken: "bad",
        }),
      ).rejects.toThrow();
      expect(mockRepo.upsertCredential).not.toHaveBeenCalled();
    });
  });
});
