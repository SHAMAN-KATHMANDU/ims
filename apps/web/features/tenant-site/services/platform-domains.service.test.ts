import { describe, it, expect, vi, beforeEach } from "vitest";
import { platformDomainsService } from "./platform-domains.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((error) => {
    throw new Error(error?.response?.data?.message || "API error");
  }),
}));

import api from "@/lib/axios";

describe("platformDomainsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listDomains", () => {
    it("returns list of domains on success", async () => {
      const mockDomains = [
        {
          id: "d1",
          tenantId: "t1",
          hostname: "www.acme.com",
          appType: "WEBSITE" as const,
          dnsVerified: true,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { domains: mockDomains },
      });

      const result = await platformDomainsService.listDomains("t1");

      expect(result).toHaveLength(1);
      expect(result[0]?.hostname).toBe("www.acme.com");
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        "/platform/tenants/t1/domains",
      );
    });

    it("handles API error on listDomains", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

      await expect(platformDomainsService.listDomains("t1")).rejects.toThrow();
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        "/platform/tenants/t1/domains",
      );
    });
  });

  describe("createDomain", () => {
    it("creates a domain and returns it", async () => {
      const payload = {
        hostname: "example.com",
        appType: "WEBSITE" as const,
      };
      const mockDomain = {
        id: "d1",
        tenantId: "t1",
        ...payload,
        dnsVerified: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      vi.mocked(api.post).mockResolvedValue({
        data: { domain: mockDomain },
      });

      const result = await platformDomainsService.createDomain("t1", payload);

      expect(result.hostname).toBe("example.com");
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/platform/tenants/t1/domains",
        payload,
      );
    });

    it("handles conflict error on createDomain", async () => {
      vi.mocked(api.post).mockRejectedValue(
        new Error("Hostname already registered"),
      );

      await expect(
        platformDomainsService.createDomain("t1", {
          hostname: "example.com",
          appType: "WEBSITE",
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateDomain", () => {
    it("updates a domain and returns it", async () => {
      const payload = { isPrimary: true };
      const mockDomain = {
        id: "d1",
        tenantId: "t1",
        hostname: "example.com",
        appType: "WEBSITE",
        isPrimary: true,
        dnsVerified: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      vi.mocked(api.patch).mockResolvedValue({
        data: { domain: mockDomain },
      });

      const result = await platformDomainsService.updateDomain("d1", payload);

      expect(result.isPrimary).toBe(true);
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        "/platform/domains/d1",
        payload,
      );
    });
  });

  describe("deleteDomain", () => {
    it("deletes a domain", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await platformDomainsService.deleteDomain("d1");

      expect(vi.mocked(api.delete)).toHaveBeenCalledWith(
        "/platform/domains/d1",
      );
    });
  });

  describe("verifyDomain", () => {
    it("verifies a domain", async () => {
      const mockResult = {
        verified: true,
        dnsVerified: true,
      };
      vi.mocked(api.post).mockResolvedValue({
        data: mockResult,
      });

      const result = await platformDomainsService.verifyDomain("d1");

      expect(result.verified).toBe(true);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/platform/domains/d1/verify",
      );
    });
  });

  describe("getDomainVerificationInstructions", () => {
    it("returns verification instructions", async () => {
      const mockInstructions = {
        records: [
          {
            type: "A" as const,
            name: "example.com",
            value: "1.2.3.4",
          },
        ],
        ttl: 3600,
      };
      vi.mocked(api.get).mockResolvedValue({
        data: mockInstructions,
      });

      const result =
        await platformDomainsService.getDomainVerificationInstructions("d1");

      expect(result.records).toHaveLength(1);
      expect(result.ttl).toBe(3600);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        "/platform/domains/d1/verification",
      );
    });
  });
});
