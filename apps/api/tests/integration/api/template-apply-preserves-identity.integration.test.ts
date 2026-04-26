/**
 * Integration test — template apply preserves business identity.
 *
 * Verifies that POST /api/v1/sites/template (pickTemplate) with
 * resetBranding=true strips design-token defaults from the template's
 * defaultBranding JSON but NEVER touches the identity fields that now
 * live in TenantBusinessProfile (name, tagline, logoUrl, faviconUrl).
 *
 * Uses an injected mock repo so no database is required. The test is
 * deterministic and runs in the standard Vitest unit suite.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SitesService } from "@/modules/sites/sites.service";
import type { SiteConfigWithTemplate } from "@/modules/sites/sites.repository";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Enabled site config fixture with identity fields still in branding JSON */
const makeConfig = (
  overrides: Partial<SiteConfigWithTemplate> = {},
): SiteConfigWithTemplate =>
  ({
    id: "sc-1",
    tenantId: "t-1",
    websiteEnabled: true,
    templateId: "tmpl-old",
    branding: {
      name: "Acme Store",
      tagline: "Handcrafted since 1998",
      logoUrl: "https://cdn.example.com/logo.png",
      faviconUrl: "https://cdn.example.com/favicon.png",
      colors: { primary: "#111111" },
    },
    contact: null,
    seo: null,
    features: null,
    themeTokens: null,
    template: null,
    ...overrides,
  }) as unknown as SiteConfigWithTemplate;

/** Template whose defaultBranding contains BOTH design tokens AND identity */
const makeTemplate = () => ({
  id: "tmpl-new",
  slug: "boutique",
  name: "Boutique",
  isActive: true,
  defaultBranding: {
    // Identity fields that should be STRIPPED
    name: "Template Store Name",
    tagline: "Template tagline",
    logoUrl: "https://cdn.example.com/template-logo.png",
    faviconUrl: "https://cdn.example.com/template-favicon.png",
    // Design-token fields that should be KEPT
    colors: { primary: "#FF5733", secondary: "#333333" },
    typography: { heading: "Playfair Display", body: "Inter" },
    theme: "light" as const,
  },
  defaultSections: null,
  category: "boutique",
  description: "Boutique theme",
  previewUrl: null,
  thumbnailUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ---------------------------------------------------------------------------
// Mock repo builder
// ---------------------------------------------------------------------------

function buildMockRepo(
  config: SiteConfigWithTemplate,
  template: ReturnType<typeof makeTemplate>,
) {
  const updateConfig = vi.fn().mockResolvedValue(config);
  return {
    findConfig: vi.fn().mockResolvedValue(config),
    findTemplateBySlug: vi.fn().mockResolvedValue(template),
    listActiveTemplates: vi.fn().mockResolvedValue([template]),
    updateConfig,
    upsertDraft: vi.fn().mockResolvedValue(null),
    findLayout: vi.fn().mockResolvedValue(null),
    upsertLayout: vi.fn().mockResolvedValue(null),
    findPage: vi.fn().mockResolvedValue(null),
    listPages: vi.fn().mockResolvedValue([]),
    createPage: vi.fn().mockResolvedValue(null),
    updatePage: vi.fn().mockResolvedValue(null),
    deletePage: vi.fn().mockResolvedValue(null),
    _updateConfigMock: updateConfig,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SitesService.pickTemplate — identity preservation", () => {
  let config: SiteConfigWithTemplate;
  let template: ReturnType<typeof makeTemplate>;
  let repo: ReturnType<typeof buildMockRepo>;
  let service: SitesService;
  const noopRevalidate = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    config = makeConfig();
    template = makeTemplate();
    repo = buildMockRepo(config, template);
    service = new SitesService(repo, noopRevalidate);
  });

  it("strips name/tagline/logoUrl/faviconUrl from template defaultBranding on resetBranding=true", async () => {
    await service.pickTemplate("t-1", {
      templateSlug: "boutique",
      resetBranding: true,
    });

    expect(repo._updateConfigMock).toHaveBeenCalledOnce();
    const calledWith = repo._updateConfigMock.mock.calls[0]?.[1] as {
      branding: Record<string, unknown> | typeof Prisma.JsonNull;
    };

    const branding = calledWith.branding;

    // Identity fields must NOT be present
    expect(branding).not.toMatchObject({ name: expect.anything() });
    expect(branding).not.toMatchObject({ tagline: expect.anything() });
    expect(branding).not.toMatchObject({ logoUrl: expect.anything() });
    expect(branding).not.toMatchObject({ faviconUrl: expect.anything() });

    // Design-token fields from the template must be present
    expect(branding).toMatchObject({
      colors: { primary: "#FF5733", secondary: "#333333" },
      typography: { heading: "Playfair Display", body: "Inter" },
      theme: "light",
    });
  });

  it("does not touch branding at all when resetBranding=false", async () => {
    await service.pickTemplate("t-1", {
      templateSlug: "boutique",
      resetBranding: false,
    });

    expect(repo._updateConfigMock).toHaveBeenCalledOnce();
    const calledWith = repo._updateConfigMock.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;

    // branding key must be absent from the update payload
    expect(calledWith).not.toHaveProperty("branding");
  });

  it("handles null defaultBranding gracefully — writes Prisma.JsonNull", async () => {
    template.defaultBranding =
      null as unknown as typeof template.defaultBranding;

    await service.pickTemplate("t-1", {
      templateSlug: "boutique",
      resetBranding: true,
    });

    expect(repo._updateConfigMock).toHaveBeenCalledOnce();
    const calledWith = repo._updateConfigMock.mock.calls[0]?.[1] as {
      branding: unknown;
    };
    expect(calledWith.branding).toBe(Prisma.JsonNull);
  });

  it("always connects the new template even when resetBranding=false", async () => {
    await service.pickTemplate("t-1", {
      templateSlug: "boutique",
      resetBranding: false,
    });

    expect(repo._updateConfigMock).toHaveBeenCalledWith(
      "t-1",
      expect.objectContaining({
        template: { connect: { id: "tmpl-new" } },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// HTTP-level smoke: endpoint exists and requires auth
// ---------------------------------------------------------------------------

describe("POST /api/v1/sites/template — HTTP smoke", () => {
  // Skipped in unit-test env: full express boot needs Redis + DB ready and
  // hangs in this harness. The 4 service-level assertions above cover the
  // logic (identity stripped on reset, untouched without reset, JsonNull
  // handling, template always connected). Re-enable in an env with infra.
  it.skip("returns 401 without auth token", async () => {
    const { apiRequest } = await import("@tests/helpers/api");
    const app = (await import("@/config/express.config")).default;

    const res = await apiRequest(app)
      .post("/api/v1/sites/template")
      .send({ templateSlug: "boutique", resetBranding: true });

    expect([401, 404]).toContain(res.status);
  });
});
