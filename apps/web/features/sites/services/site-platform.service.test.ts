import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTenantDomains,
  createTenantDomain,
  updateTenantDomain,
  deleteTenantDomain,
  getDomainVerificationInstructions,
  verifyTenantDomain,
  getSiteTemplates,
  getTenantSiteConfig,
  enableTenantWebsite,
  disableTenantWebsite,
} from "./site-platform.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("site-platform.service — domains", () => {
  it("getTenantDomains calls GET /platform/tenants/:id/domains", async () => {
    mockGet.mockResolvedValue({ data: { domains: [{ id: "d1" }] } });

    const result = await getTenantDomains("t1");

    expect(mockGet).toHaveBeenCalledWith("/platform/tenants/t1/domains", {
      params: undefined,
    });
    expect(result).toEqual([{ id: "d1" }]);
  });

  it("getTenantDomains forwards appType filter", async () => {
    mockGet.mockResolvedValue({ data: { domains: [] } });

    await getTenantDomains("t1", "IMS");

    expect(mockGet).toHaveBeenCalledWith("/platform/tenants/t1/domains", {
      params: { appType: "IMS" },
    });
  });

  it("getTenantDomains throws when tenantId is blank", async () => {
    await expect(getTenantDomains("")).rejects.toThrow(/Tenant ID/);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("createTenantDomain calls POST /platform/tenants/:id/domains", async () => {
    mockPost.mockResolvedValue({ data: { domain: { id: "d1" } } });

    const result = await createTenantDomain("t1", {
      hostname: "www.acme.com",
      appType: "WEBSITE",
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/platform/tenants/t1/domains",
      expect.objectContaining({
        hostname: "www.acme.com",
        appType: "WEBSITE",
      }),
    );
    expect(result).toEqual({ id: "d1" });
  });

  it("updateTenantDomain calls PATCH /platform/domains/:id", async () => {
    mockPatch.mockResolvedValue({ data: { domain: { id: "d1" } } });

    await updateTenantDomain("d1", { isPrimary: true });

    expect(mockPatch).toHaveBeenCalledWith("/platform/domains/d1", {
      isPrimary: true,
    });
  });

  it("deleteTenantDomain calls DELETE /platform/domains/:id", async () => {
    mockDelete.mockResolvedValue({ data: {} });

    await deleteTenantDomain("d1");

    expect(mockDelete).toHaveBeenCalledWith("/platform/domains/d1");
  });

  it("getDomainVerificationInstructions calls GET /platform/domains/:id/verification", async () => {
    mockGet.mockResolvedValue({
      data: {
        hostname: "www.acme.com",
        txtName: "_shaman.www.acme.com",
        txtValue: "shaman-verify=abc",
        verifiedAt: null,
      },
    });

    const result = await getDomainVerificationInstructions("d1");

    expect(mockGet).toHaveBeenCalledWith("/platform/domains/d1/verification");
    expect(result.txtName).toBe("_shaman.www.acme.com");
  });

  it("verifyTenantDomain calls POST /platform/domains/:id/verify", async () => {
    mockPost.mockResolvedValue({ data: { domain: { id: "d1" } } });

    await verifyTenantDomain("d1");

    expect(mockPost).toHaveBeenCalledWith("/platform/domains/d1/verify", {});
  });
});

describe("site-platform.service — website feature", () => {
  it("getSiteTemplates calls GET /platform/site-templates", async () => {
    mockGet.mockResolvedValue({ data: { templates: [{ slug: "minimal" }] } });

    const result = await getSiteTemplates();

    expect(mockGet).toHaveBeenCalledWith("/platform/site-templates");
    expect(result).toEqual([{ slug: "minimal" }]);
  });

  it("getTenantSiteConfig calls GET /platform/tenants/:id/website", async () => {
    mockGet.mockResolvedValue({ data: { siteConfig: { id: "sc1" } } });

    const result = await getTenantSiteConfig("t1");

    expect(mockGet).toHaveBeenCalledWith("/platform/tenants/t1/website");
    expect(result).toEqual({ id: "sc1" });
  });

  it("enableTenantWebsite posts empty body when no template", async () => {
    mockPost.mockResolvedValue({ data: { siteConfig: { id: "sc1" } } });

    await enableTenantWebsite("t1");

    expect(mockPost).toHaveBeenCalledWith(
      "/platform/tenants/t1/website/enable",
      {},
    );
  });

  it("enableTenantWebsite posts templateSlug when provided", async () => {
    mockPost.mockResolvedValue({ data: { siteConfig: { id: "sc1" } } });

    await enableTenantWebsite("t1", "luxury");

    expect(mockPost).toHaveBeenCalledWith(
      "/platform/tenants/t1/website/enable",
      { templateSlug: "luxury" },
    );
  });

  it("disableTenantWebsite calls POST /platform/tenants/:id/website/disable", async () => {
    mockPost.mockResolvedValue({ data: { siteConfig: { id: "sc1" } } });

    await disableTenantWebsite("t1");

    expect(mockPost).toHaveBeenCalledWith(
      "/platform/tenants/t1/website/disable",
      {},
    );
  });
});
