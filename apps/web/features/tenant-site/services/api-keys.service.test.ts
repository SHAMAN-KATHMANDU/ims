import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiKeysService } from "./api-keys.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((error) => {
    throw new Error(error?.response?.data?.message || "API error");
  }),
}));

import api from "@/lib/axios";

describe("apiKeysService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listApiKeys", () => {
    it("returns list of API keys on success", async () => {
      const mockKeys = [
        {
          id: "k1",
          tenantId: "t1",
          tenantDomainId: "d1",
          name: "Production Key",
          prefix: "pk_live",
          lastFour: "abcd",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { keys: mockKeys },
      });

      const result = await apiKeysService.listApiKeys();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Production Key");
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/public-api-keys");
    });

    it("handles API error on listApiKeys", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

      await expect(apiKeysService.listApiKeys()).rejects.toThrow();
    });
  });

  describe("createApiKey", () => {
    it("creates an API key and returns it with secret", async () => {
      const payload = {
        name: "New Key",
        tenantDomainId: "d1",
      };
      const mockKey = {
        id: "k2",
        tenantId: "t1",
        tenantDomainId: "d1",
        name: "New Key",
        prefix: "pk_live",
        lastFour: "efgh",
        secret: "pk_live_supersecretvalue_never_shown_again",
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      vi.mocked(api.post).mockResolvedValue({
        data: mockKey,
      });

      const result = await apiKeysService.createApiKey(payload);

      expect(result.secret).toBeDefined();
      expect(result.name).toBe("New Key");
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/public-api-keys",
        payload,
      );
    });

    it("handles validation error on createApiKey", async () => {
      vi.mocked(api.post).mockRejectedValue(
        new Error("Domain not DNS-verified"),
      );

      await expect(
        apiKeysService.createApiKey({
          name: "Invalid Key",
          tenantDomainId: "unverified-domain",
        }),
      ).rejects.toThrow();
    });
  });

  describe("rotateApiKey", () => {
    it("rotates an API key and returns new key with secret", async () => {
      const mockKey = {
        id: "k2_new",
        tenantId: "t1",
        tenantDomainId: "d1",
        name: "New Key",
        prefix: "pk_live",
        lastFour: "ijkl",
        secret: "pk_live_newsecretvalue_never_shown_again",
        createdAt: "2024-01-03T00:00:00Z",
        updatedAt: "2024-01-03T00:00:00Z",
      };
      vi.mocked(api.post).mockResolvedValue({
        data: mockKey,
      });

      const result = await apiKeysService.rotateApiKey("k2");

      expect(result.secret).toBeDefined();
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/public-api-keys/k2/rotate",
        {},
      );
    });

    it("rotates with optional metadata", async () => {
      const payload = { name: "Updated Name" };
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: "k2_new",
          name: "Updated Name",
          secret: "pk_live_newsecret",
        },
      });

      const result = await apiKeysService.rotateApiKey("k2", payload);

      expect(result.name).toBe("Updated Name");
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/public-api-keys/k2/rotate",
        payload,
      );
    });
  });

  describe("deleteApiKey", () => {
    it("deletes an API key", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await apiKeysService.deleteApiKey("k1");

      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/public-api-keys/k1");
    });

    it("handles not found error", async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error("Key not found"));

      await expect(
        apiKeysService.deleteApiKey("nonexistent"),
      ).rejects.toThrow();
    });
  });
});
