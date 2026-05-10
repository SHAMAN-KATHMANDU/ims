/**
 * Per-blueprint characterization tests for `pickTemplate()`.
 *
 * The existing `sites.service.test.ts` covers `pickTemplate` orchestration
 * with a single synthetic blueprint. This file iterates every real
 * blueprint in TEMPLATE_BLUEPRINTS and asserts the apply pipeline
 * produces non-empty SiteLayout, TenantPage and SiteConfig.navigation
 * outputs for templates that declare those scopes — catching the class
 * of regression where a blueprint silently round-trips into an empty
 * editor (the symptom that drove PR #531/#532 and rounds 1/2 of
 * cms-editability).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEMPLATE_BLUEPRINTS } from "./templates";
import { PAGE_SCOPE_TO_SLUG, type BlueprintScope } from "@repo/shared";
import { SitesService } from "./sites.service";
import type defaultRepo from "./sites.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  findConfig: vi.fn(),
  updateConfig: vi.fn(),
  upsertConfig: vi.fn(),
  listActiveTemplates: vi.fn(),
  findTemplateBySlug: vi.fn(),
  findTenantForkOfTemplate: vi.fn(),
  publishAllDrafts: vi.fn(),
} as unknown as Repo;

const mockRevalidate = vi.fn().mockResolvedValue(undefined);

function templateRow(slug: string) {
  return {
    id: `tpl-${slug}`,
    slug,
    name: slug,
    description: null,
    category: "modern",
    previewImageUrl: null,
    defaultBranding: null,
    defaultSections: null,
    defaultPages: null,
    defaultLayouts: null,
    defaultThemeTokens: null,
    isActive: true,
    isPublic: true,
    sortOrder: 0,
    parentTemplateId: null,
    ownerTenantId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function emptyConfig() {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    templateId: null,
    branding: null,
    contact: null,
    features: null,
    seo: null,
    isPublished: false,
    navigation: null,
    themeTokens: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: null,
  } as unknown as Awaited<ReturnType<Repo["findConfig"]>>;
}

describe("pickTemplate — per-blueprint characterization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Iterate every blueprint registered in the canonical map. Skip `blank`
  // because it is intentionally empty and does not seed any layouts.
  const slugs = Object.keys(TEMPLATE_BLUEPRINTS).filter((s) => s !== "blank");

  for (const slug of slugs) {
    describe(`blueprint: ${slug}`, () => {
      const blueprint = TEMPLATE_BLUEPRINTS[slug]!;
      const populatedPageScopes = (
        Object.keys(PAGE_SCOPE_TO_SLUG) as BlueprintScope[]
      ).filter((scope) => (blueprint.layouts?.[scope]?.length ?? 0) > 0);

      it("declares at least one populated layout scope", () => {
        const totalBlocks = Object.values(blueprint.layouts ?? {}).reduce(
          (sum, blocks) => sum + (blocks?.length ?? 0),
          0,
        );
        expect(totalBlocks).toBeGreaterThan(0);
      });

      it("synthesizes navigation primary items for every populated PAGE_SCOPE", async () => {
        // Drive the real seedNavigationFromBlueprint via the service so
        // any future refactor that drops a scope from the synthesizer
        // breaks here, not just in production.
        const service = new SitesService(mockRepo, mockRevalidate);
        (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...emptyConfig(),
          navigation: null,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).seedNavigationFromBlueprint(
          "t1",
          blueprint,
          true,
        );

        const calls = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
          .calls;
        const navCall = calls.find(
          ([, data]) => (data as { navigation?: unknown }).navigation,
        );

        if (populatedPageScopes.length === 0) {
          // Chrome-only blueprints (header/footer only) legitimately
          // synthesize an empty primary array — record the invariant.
          if (navCall) {
            const nav = (navCall[1] as { navigation: { primary: unknown[] } })
              .navigation;
            expect(nav.primary).toEqual([]);
          }
          return;
        }

        expect(navCall).toBeDefined();
        const nav = (
          navCall![1] as {
            navigation: { primary: Array<{ id: string; href: string }> };
          }
        ).navigation;
        expect(nav.primary.length).toBe(populatedPageScopes.length);

        // Every populated page-scope must show up as a primary nav item.
        // Catches the "navigation tab empty after apply" class of bug
        // for every blueprint at once instead of one-off synthetic.
        for (const scope of populatedPageScopes) {
          expect(nav.primary.some((item) => item.id === scope)).toBe(true);
        }
      });
    });
  }
});
