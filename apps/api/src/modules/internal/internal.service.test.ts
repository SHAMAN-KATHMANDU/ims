import { describe, it, expect, vi, beforeEach } from "vitest";
import { InternalService } from "./internal.service";
import type defaultRepo from "./internal.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  findDomainWithContext: vi.fn(),
} as unknown as Repo;

const service = new InternalService(mockRepo);

function domainContext(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    tenantId: "t1",
    hostname: "www.acme.com",
    appType: "WEBSITE" as const,
    isPrimary: true,
    verifyToken: "tok123",
    verifiedAt: new Date(),
    tlsStatus: "PENDING" as const,
    tlsLastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: {
      id: "t1",
      name: "Acme",
      slug: "acme",
      isActive: true,
    },
    tenant_site_config: {
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      templateId: "tpl1",
      isPublished: true,
      branding: null,
      contact: null,
      features: null,
      seo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

describe("InternalService.isDomainAllowedForTls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a verified website domain with enabled feature", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext());
    const result = await service.isDomainAllowedForTls("www.acme.com");
    expect(result).toEqual({
      allowed: true,
      tenantId: "t1",
      hostname: "www.acme.com",
      appType: "WEBSITE",
    });
  });

  it("denies unknown host", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);
    const result = await service.isDomainAllowedForTls("unknown.example");
    expect(result).toEqual({ allowed: false, reason: "unknown_host" });
  });

  it("denies inactive tenant", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      domainContext({
        tenant: {
          id: "t1",
          name: "Acme",
          slug: "acme",
          isActive: false,
        },
      }),
    );
    const result = await service.isDomainAllowedForTls("www.acme.com");
    expect(result).toEqual({ allowed: false, reason: "tenant_inactive" });
  });

  it("denies non-WEBSITE appType (strict — IMS never via Caddy)", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext({ appType: "IMS" }));
    const result = await service.isDomainAllowedForTls("ims.acme.com");
    expect(result).toEqual({
      allowed: false,
      reason: "ims_not_allowed_via_caddy",
    });
  });

  it("denies unverified domain (strict — no cert until TXT passes)", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext({ verifiedAt: null }));
    const result = await service.isDomainAllowedForTls("www.acme.com");
    expect(result).toEqual({ allowed: false, reason: "not_verified" });
  });

  it("denies when SiteConfig missing", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext({ tenant_site_config: null }));
    const result = await service.isDomainAllowedForTls("www.acme.com");
    expect(result).toEqual({ allowed: false, reason: "website_disabled" });
  });

  it("denies when websiteEnabled=false", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      domainContext({
        tenant_site_config: {
          id: "sc1",
          tenantId: "t1",
          websiteEnabled: false,
          templateId: "tpl1",
          isPublished: true,
          branding: null,
          contact: null,
          features: null,
          seo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    );
    const result = await service.isDomainAllowedForTls("www.acme.com");
    expect(result).toEqual({ allowed: false, reason: "website_disabled" });
  });
});

describe("InternalService.resolveHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a published site", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext());
    const result = await service.resolveHost("www.acme.com");
    expect(result).toMatchObject({
      resolved: true,
      tenantId: "t1",
      tenantSlug: "acme",
      hostname: "www.acme.com",
      websiteEnabled: true,
      isPublished: true,
    });
  });

  it("still resolves an unpublished site so renderer can show 'coming soon'", async () => {
    // Wait — current policy is to 404 unpublished. Spec says the renderer
    // handles 'coming soon'. Per our service code above, we DO 404 unpublished
    // here as well because it short-circuits on websiteEnabled. But an
    // unpublished-but-enabled site... let's assert the current behavior.
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      domainContext({
        tenant_site_config: {
          id: "sc1",
          tenantId: "t1",
          websiteEnabled: true,
          templateId: "tpl1",
          isPublished: false,
          branding: null,
          contact: null,
          features: null,
          seo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    );
    const result = await service.resolveHost("www.acme.com");
    expect(result).toMatchObject({
      resolved: true,
      isPublished: false,
    });
  });

  it("404s unknown host", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);
    const result = await service.resolveHost("unknown.example");
    expect(result).toEqual({ resolved: false, reason: "unknown_host" });
  });

  it("404s unverified host", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext({ verifiedAt: null }));
    const result = await service.resolveHost("www.acme.com");
    expect(result).toEqual({ resolved: false, reason: "not_verified" });
  });

  it("404s inactive tenant", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      domainContext({
        tenant: { id: "t1", name: "Acme", slug: "acme", isActive: false },
      }),
    );
    const result = await service.resolveHost("www.acme.com");
    expect(result).toEqual({ resolved: false, reason: "tenant_inactive" });
  });

  it("treats IMS-typed hosts as unknown (renderer should never see them)", async () => {
    (
      mockRepo.findDomainWithContext as ReturnType<typeof vi.fn>
    ).mockResolvedValue(domainContext({ appType: "IMS" }));
    const result = await service.resolveHost("ims.acme.com");
    expect(result).toEqual({ resolved: false, reason: "unknown_host" });
  });
});
