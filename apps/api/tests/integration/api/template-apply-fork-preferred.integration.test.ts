/**
 * Integration test — template apply prefers tenant fork's layouts/themes.
 *
 * Verifies that when a tenant has forked a template and edited it, applying
 * that template slug uses the fork's defaultLayouts and defaultThemeTokens
 * over the canonical blueprint. Tests the fallback chain:
 * 1. Tenant fork's defaultLayouts/defaultThemeTokens (if present)
 * 2. Canonical SiteTemplate row's defaultLayouts/defaultThemeTokens (if present)
 * 3. In-code TEMPLATE_BLUEPRINTS map (fallback)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SitesService } from "@/modules/sites/sites.service";
import type { SiteConfigWithTemplate } from "@/modules/sites/sites.repository";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeConfig = (
  overrides: Partial<SiteConfigWithTemplate> = {},
): SiteConfigWithTemplate =>
  ({
    id: "sc-1",
    tenantId: "t-1",
    websiteEnabled: true,
    templateId: "tmpl-canonical",
    branding: null,
    contact: null,
    seo: null,
    features: null,
    themeTokens: null,
    template: null,
    ...overrides,
  }) as unknown as SiteConfigWithTemplate;

const canonicalTemplate = {
  id: "tmpl-canonical",
  slug: "auric",
  name: "Auric",
  isActive: true,
  category: "premium",
  description: "Premium template",
  previewImageUrl: null,
  defaultBranding: null,
  defaultSections: null,
  defaultPages: null,
  // Canonical blueprint has these layouts/tokens
  defaultLayouts: {
    home: [
      {
        id: "canonical-hero-1",
        kind: "hero",
        props: { text: "Canonical Hero" },
      },
    ],
    "products-index": [
      {
        id: "canonical-grid-1",
        kind: "product-grid",
        props: { collectionId: "canonical" },
      },
    ],
  },
  defaultThemeTokens: {
    mode: "light",
    colors: { primary: "#CANONICAL" },
  },
  parentTemplateId: null,
  ownerTenantId: null,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tenantFork = {
  id: "tmpl-fork-1",
  slug: "auric", // Same slug as canonical
  name: "Auric (Edited)",
  isActive: true,
  category: "premium",
  description: "User fork of Auric",
  previewImageUrl: null,
  defaultBranding: null,
  defaultSections: null,
  defaultPages: null,
  // Fork has edited layouts/tokens
  defaultLayouts: {
    home: [
      {
        id: "fork-hero-1",
        kind: "hero",
        props: { text: "Fork Hero - User Edited" },
      },
    ],
    "products-index": [
      {
        id: "fork-grid-1",
        kind: "product-grid",
        props: { collectionId: "fork-custom" },
      },
    ],
  },
  defaultThemeTokens: {
    mode: "dark",
    colors: { primary: "#FORK123" },
  },
  parentTemplateId: "tmpl-canonical",
  ownerTenantId: "t-1",
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Mock repo builder
// ---------------------------------------------------------------------------

function buildMockRepo(
  config: SiteConfigWithTemplate,
  forkResult: typeof tenantFork | null,
) {
  const updateConfig = vi.fn().mockResolvedValue(config);
  return {
    findConfig: vi.fn().mockResolvedValue(config),
    findTemplateBySlug: vi.fn().mockResolvedValue(canonicalTemplate),
    findTenantForkOfTemplate: vi.fn().mockResolvedValue(forkResult),
    listActiveTemplates: vi.fn().mockResolvedValue([canonicalTemplate]),
    updateConfig,
    upsertConfig: vi.fn().mockResolvedValue(config),
    upsertDraft: vi.fn().mockResolvedValue(null),
    findLayout: vi.fn().mockResolvedValue(null),
    upsertLayout: vi.fn().mockResolvedValue(null),
    findPage: vi.fn().mockResolvedValue(null),
    listPages: vi.fn().mockResolvedValue([]),
    createPage: vi.fn().mockResolvedValue(null),
    updatePage: vi.fn().mockResolvedValue(null),
    deletePage: vi.fn().mockResolvedValue(null),
    publishAllDrafts: vi.fn().mockResolvedValue({ scopes: [] }),
    _updateConfigMock: updateConfig,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SitesService.pickTemplate — fork preference", () => {
  let config: SiteConfigWithTemplate;
  let repo: ReturnType<typeof buildMockRepo>;
  let service: SitesService;
  const noopRevalidate = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    config = makeConfig();
  });

  it("prefers fork's defaultThemeTokens when fork exists", async () => {
    repo = buildMockRepo(config, tenantFork);
    // Mock seedLayoutsFromBlueprint to avoid DB interaction
    repo.publishAllDrafts = vi.fn().mockResolvedValue({ scopes: [] });
    service = new SitesService(repo, noopRevalidate);
    const seedLayoutsSpy = vi
      .spyOn(service, "seedLayoutsFromBlueprint" as any)
      .mockResolvedValue(undefined);
    // pickTemplate now also writes auto-synthesized TenantPages via
    // seedCustomPagesFromBlueprint; stub it out so this test stays focused on
    // the fork-preference resolution path and doesn't need a real DB tenant.
    vi.spyOn(service, "seedCustomPagesFromBlueprint" as any).mockResolvedValue(
      undefined,
    );
    // Same reasoning for seedNavigationFromBlueprint, added in PR #532.
    vi.spyOn(service, "seedNavigationFromBlueprint" as any).mockResolvedValue(
      undefined,
    );

    await service.pickTemplate("t-1", {
      templateSlug: "auric",
      resetBranding: true,
    });

    expect(repo._updateConfigMock).toHaveBeenCalledOnce();
    const calledWith = repo._updateConfigMock.mock.calls[0]?.[1] as {
      themeTokens: unknown;
    };

    // Should use fork's theme tokens, not canonical's
    expect(calledWith.themeTokens).toEqual({
      mode: "dark",
      colors: { primary: "#FORK123" },
    });
  });

  it("falls back to canonical's defaultThemeTokens when fork is null", async () => {
    repo = buildMockRepo(config, null);
    repo.publishAllDrafts = vi.fn().mockResolvedValue({ scopes: [] });
    service = new SitesService(repo, noopRevalidate);
    const seedLayoutsSpy = vi
      .spyOn(service, "seedLayoutsFromBlueprint" as any)
      .mockResolvedValue(undefined);
    // pickTemplate now also writes auto-synthesized TenantPages via
    // seedCustomPagesFromBlueprint; stub it out so this test stays focused on
    // the fork-preference resolution path and doesn't need a real DB tenant.
    vi.spyOn(service, "seedCustomPagesFromBlueprint" as any).mockResolvedValue(
      undefined,
    );
    // Same reasoning for seedNavigationFromBlueprint, added in PR #532.
    vi.spyOn(service, "seedNavigationFromBlueprint" as any).mockResolvedValue(
      undefined,
    );

    await service.pickTemplate("t-1", {
      templateSlug: "auric",
      resetBranding: true,
    });

    expect(repo._updateConfigMock).toHaveBeenCalledOnce();
    const calledWith = repo._updateConfigMock.mock.calls[0]?.[1] as {
      themeTokens: unknown;
    };

    // Should use canonical's theme tokens since no fork exists
    expect(calledWith.themeTokens).toEqual({
      mode: "light",
      colors: { primary: "#CANONICAL" },
    });
  });

  it("calls findTenantForkOfTemplate with correct tenantId and templateId", async () => {
    repo = buildMockRepo(config, tenantFork);
    repo.publishAllDrafts = vi.fn().mockResolvedValue({ scopes: [] });
    service = new SitesService(repo, noopRevalidate);
    const seedLayoutsSpy = vi
      .spyOn(service, "seedLayoutsFromBlueprint" as any)
      .mockResolvedValue(undefined);
    // pickTemplate now also writes auto-synthesized TenantPages via
    // seedCustomPagesFromBlueprint; stub it out so this test stays focused on
    // the fork-preference resolution path and doesn't need a real DB tenant.
    vi.spyOn(service, "seedCustomPagesFromBlueprint" as any).mockResolvedValue(
      undefined,
    );
    // Same reasoning for seedNavigationFromBlueprint, added in PR #532.
    vi.spyOn(service, "seedNavigationFromBlueprint" as any).mockResolvedValue(
      undefined,
    );

    await service.pickTemplate("t-1", {
      templateSlug: "auric",
      resetBranding: false,
    });

    expect(repo.findTenantForkOfTemplate).toHaveBeenCalledWith(
      "t-1",
      "tmpl-canonical",
    );
  });

  it("passes fork's layouts to seedLayoutsFromBlueprint", async () => {
    repo = buildMockRepo(config, tenantFork);
    repo.publishAllDrafts = vi.fn().mockResolvedValue({ scopes: [] });
    service = new SitesService(repo, noopRevalidate);
    const seedLayoutsSpy = vi
      .spyOn(service, "seedLayoutsFromBlueprint" as any)
      .mockResolvedValue(undefined);
    // pickTemplate now also writes auto-synthesized TenantPages via
    // seedCustomPagesFromBlueprint; stub it out so this test stays focused on
    // the fork-preference resolution path and doesn't need a real DB tenant.
    vi.spyOn(service, "seedCustomPagesFromBlueprint" as any).mockResolvedValue(
      undefined,
    );
    // Same reasoning for seedNavigationFromBlueprint, added in PR #532.
    vi.spyOn(service, "seedNavigationFromBlueprint" as any).mockResolvedValue(
      undefined,
    );

    await service.pickTemplate("t-1", {
      templateSlug: "auric",
      resetBranding: true,
    });

    expect(seedLayoutsSpy).toHaveBeenCalledOnce();
    const passedBlueprint = seedLayoutsSpy.mock.calls[0]?.[1] as {
      layouts?: Record<string, unknown>;
    };

    // The blueprint passed to seedLayouts should contain fork's layouts
    expect((passedBlueprint?.layouts as Record<string, unknown>)?.home).toEqual(
      [
        {
          id: "fork-hero-1",
          kind: "hero",
          props: { text: "Fork Hero - User Edited" },
        },
      ],
    );
    expect(
      (passedBlueprint?.layouts as Record<string, unknown>)?.["products-index"],
    ).toEqual([
      {
        id: "fork-grid-1",
        kind: "product-grid",
        props: { collectionId: "fork-custom" },
      },
    ]);
  });
});
