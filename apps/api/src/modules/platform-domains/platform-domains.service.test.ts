import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformDomainsService } from "./platform-domains.service";
import type defaultRepo from "./platform-domains.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  findById: vi.fn(),
  findByHostname: vi.fn(),
  listByTenant: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  clearOtherPrimaries: vi.fn(),
  tenantExists: vi.fn(),
} as unknown as Repo;

const mockResolveTxt = vi.fn();
const mockAssertWebsiteEnabled = vi.fn();

const service = new PlatformDomainsService(
  mockRepo,
  mockResolveTxt,
  mockAssertWebsiteEnabled as unknown as (tenantId: string) => Promise<void>,
);

function domain(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    tenantId: "t1",
    hostname: "www.acme.com",
    appType: "WEBSITE" as const,
    isPrimary: false,
    verifyToken: "tok123",
    verifiedAt: null,
    tlsStatus: "PENDING" as const,
    tlsLastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PlatformDomainsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: website feature is enabled so existing addDomain tests pass.
    mockAssertWebsiteEnabled.mockResolvedValue(undefined);
  });

  describe("listTenantDomains", () => {
    it("returns domains when tenant exists", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.listByTenant as ReturnType<typeof vi.fn>).mockResolvedValue([
        domain(),
      ]);

      const result = await service.listTenantDomains("t1");
      expect(result).toHaveLength(1);
      expect(mockRepo.listByTenant).toHaveBeenCalledWith("t1", undefined);
    });

    it("throws 404 when tenant is missing", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.listTenantDomains("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("passes appType filter to repo", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.listByTenant as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await service.listTenantDomains("t1", "IMS");
      expect(mockRepo.listByTenant).toHaveBeenCalledWith("t1", "IMS");
    });
  });

  describe("addDomain", () => {
    it("creates a domain with a generated verify token", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.findByHostname as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(domain());

      const result = await service.addDomain("t1", {
        hostname: "www.acme.com",
        appType: "WEBSITE",
        isPrimary: false,
      });

      expect(result.hostname).toBe("www.acme.com");
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          hostname: "www.acme.com",
          appType: "WEBSITE",
          isPrimary: false,
          verifyToken: expect.any(String),
        }),
      );
      expect(mockRepo.clearOtherPrimaries).not.toHaveBeenCalled();
    });

    it("clears other primaries when isPrimary=true", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.findByHostname as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain({ isPrimary: true }),
      );

      await service.addDomain("t1", {
        hostname: "www.acme.com",
        appType: "WEBSITE",
        isPrimary: true,
      });

      expect(mockRepo.clearOtherPrimaries).toHaveBeenCalledWith(
        "t1",
        "WEBSITE",
        "d1",
      );
    });

    it("throws 404 when tenant is missing", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.addDomain("missing", {
          hostname: "www.acme.com",
          appType: "WEBSITE",
          isPrimary: false,
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("throws 409 when hostname already registered", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.findByHostname as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      await expect(
        service.addDomain("t1", {
          hostname: "www.acme.com",
          appType: "WEBSITE",
          isPrimary: false,
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("invokes assertWebsiteEnabled for WEBSITE appType", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.findByHostname as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(domain());

      await service.addDomain("t1", {
        hostname: "www.acme.com",
        appType: "WEBSITE",
        isPrimary: false,
      });

      expect(mockAssertWebsiteEnabled).toHaveBeenCalledWith("t1");
    });

    it("throws 409 when WEBSITE domain added but website feature disabled", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      mockAssertWebsiteEnabled.mockRejectedValue(
        Object.assign(new Error("Website feature is not enabled"), {
          statusCode: 409,
        }),
      );

      await expect(
        service.addDomain("t1", {
          hostname: "www.acme.com",
          appType: "WEBSITE",
          isPrimary: false,
        }),
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(mockRepo.findByHostname).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("does NOT call assertWebsiteEnabled for IMS appType", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.findByHostname as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain({ appType: "IMS" }),
      );

      await service.addDomain("t1", {
        hostname: "ims.acme.com",
        appType: "IMS",
        isPrimary: false,
      });

      expect(mockAssertWebsiteEnabled).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });

  describe("updateDomain", () => {
    it("updates only provided fields", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      (mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain({ appType: "IMS" }),
      );

      await service.updateDomain("d1", { appType: "IMS" });
      expect(mockRepo.update).toHaveBeenCalledWith("d1", { appType: "IMS" });
    });

    it("clears other primaries when promoting to primary", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      (mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain({ isPrimary: true }),
      );

      await service.updateDomain("d1", { isPrimary: true });
      expect(mockRepo.clearOtherPrimaries).toHaveBeenCalledWith(
        "t1",
        "WEBSITE",
        "d1",
      );
    });

    it("throws 404 when domain missing", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(
        service.updateDomain("nope", { isPrimary: true }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("deleteDomain", () => {
    it("deletes existing domain", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      await service.deleteDomain("d1");
      expect(mockRepo.delete).toHaveBeenCalledWith("d1");
    });

    it("throws 404 when missing", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(service.deleteDomain("nope")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("getVerificationInstructions", () => {
    it("returns A and TXT record instructions for the domain", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      const result = await service.getVerificationInstructions("d1");
      expect(result).toEqual({
        hostname: "www.acme.com",
        aRecordName: "www.acme.com",
        aRecordValue: expect.any(String),
        txtName: "_shaman.www.acme.com",
        txtValue: "shaman-verify=tok123",
        verifiedAt: null,
      });
    });

    it("throws 404 when missing", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(
        service.getVerificationInstructions("nope"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("verifyDomain", () => {
    it("marks verifiedAt when TXT record matches", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      mockResolveTxt.mockResolvedValue([["shaman-verify=tok123"]]);
      (mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain({ verifiedAt: new Date() }),
      );

      const result = await service.verifyDomain("d1");
      expect(mockResolveTxt).toHaveBeenCalledWith("_shaman.www.acme.com");
      expect(mockRepo.update).toHaveBeenCalledWith(
        "d1",
        expect.objectContaining({ verifiedAt: expect.any(Date) }),
      );
      expect(result.verifiedAt).not.toBeNull();
    });

    it("joins split TXT chunks before matching", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      mockResolveTxt.mockResolvedValue([["shaman-verify=", "tok123"]]);
      (mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain({ verifiedAt: new Date() }),
      );

      await service.verifyDomain("d1");
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it("throws 400 when TXT lookup fails (NXDOMAIN)", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      mockResolveTxt.mockRejectedValue(new Error("ENOTFOUND"));
      await expect(service.verifyDomain("d1")).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("throws 400 when TXT present but value mismatched", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        domain(),
      );
      mockResolveTxt.mockResolvedValue([["shaman-verify=wrong"]]);
      await expect(service.verifyDomain("d1")).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("throws 404 when domain missing", async () => {
      (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(service.verifyDomain("nope")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
