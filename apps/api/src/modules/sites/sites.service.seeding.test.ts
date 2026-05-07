/**
 * Covers the template-pick seeding behavior added in Phase 1: when a tenant
 * picks a real template slug, the service seeds both SiteLayout rows and
 * NavMenu rows (header-primary, mobile-drawer, footer-1, footer-2,
 * footer-config). Existing rows are preserved unless `resetBranding` is set.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/site-layouts/site-layouts.repository", () => ({
  default: {
    upsertDraft: vi.fn().mockResolvedValue(undefined),
    publishDraft: vi.fn().mockResolvedValue(undefined),
    findByKey: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock("@/modules/site-layouts/site-layouts.revalidate", () => ({
  revalidateSiteLayout: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/modules/nav-menus/nav-menus.repository", () => ({
  default: {
    findBySlot: vi.fn().mockResolvedValue(null),
    upsert: vi
      .fn()
      .mockImplementation((tenantId: string, slot: string) =>
        Promise.resolve({ id: `nm-${slot}`, tenantId, slot, items: {} }),
      ),
  },
}));
vi.mock("@/modules/nav-menus/nav-menus.revalidate", () => ({
  revalidateNavMenu: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./templates", () => ({
  getTemplateBlueprint: vi.fn(),
  BLUEPRINT_SCOPES: [
    "home",
    "products-index",
    "product-detail",
    "offers",
    "cart",
  ],
}));

import { SitesService } from "./sites.service";
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import navMenusRepo from "@/modules/nav-menus/nav-menus.repository";
import { getTemplateBlueprint } from "./templates";
import type defaultRepo from "./sites.repository";
import type { TemplateBlueprint, BlockNode } from "@repo/shared";

type Repo = typeof defaultRepo;

const mockRepo = {
  findConfig: vi.fn(),
  updateConfig: vi.fn(),
  listActiveTemplates: vi.fn(),
  findTemplateBySlug: vi.fn(),
  publishAllDrafts: vi.fn(),
} as unknown as Repo;

const mockRevalidate = vi.fn().mockResolvedValue(undefined);
const service = new SitesService(mockRepo, mockRevalidate);

function config(overrides: Record<string, unknown> = {}) {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    templateId: "tpl1",
    branding: null,
    contact: null,
    features: null,
    seo: null,
    themeTokens: null,
    isPublished: false,
    template: null,
    ...overrides,
  };
}

function templateRow(slug: string) {
  return {
    id: `tpl-${slug}`,
    slug,
    name: slug,
    description: "",
    category: "minimal",
    previewImageUrl: null,
    defaultBranding: null,
    defaultSections: null,
    defaultPages: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const mockNavRepo = navMenusRepo as unknown as {
  findBySlot: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};
const mockLayoutsRepo = siteLayoutsRepo as unknown as {
  upsertDraft: ReturnType<typeof vi.fn>;
  publishDraft: ReturnType<typeof vi.fn>;
};

describe("SitesService — pickTemplate nav/footer seeding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavRepo.findBySlot.mockResolvedValue(null);
    (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      config(),
    );
    (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      config({ templateId: "tpl-maison" }),
    );
    (mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
      templateRow("maison"),
    );

    // Setup default maison blueprint with all nav and layout fields
    const dummyBlock: BlockNode = {
      id: "blk1",
      kind: "section",
      props: { background: "default" },
      children: [],
    };
    const maisonBlueprint: TemplateBlueprint = {
      slug: "maison",
      layouts: {
        home: [dummyBlock],
        "products-index": [dummyBlock],
        "product-detail": [dummyBlock],
        offers: [dummyBlock],
        cart: [dummyBlock],
      },
      navConfig: {
        layout: "centered",
        behavior: "sticky",
        items: [],
        mobile: { drawerStyle: "slide-right", showSearch: false },
        showCart: true,
        showSearch: false,
        showAccount: false,
      },
      mobileDrawerConfig: {
        layout: "standard",
        behavior: "static",
        items: [],
        mobile: { drawerStyle: "slide-right", showSearch: false },
        showCart: true,
        showSearch: false,
        showAccount: false,
      },
      footerConfig: {
        layout: "columns",
        background: "muted",
        brand: {},
        columns: [],
        socials: [],
        newsletter: { enabled: false },
        legal: { showYear: true, links: [] },
      },
      footerPrimaryItems: [],
      footerSecondaryItems: [],
    };

    (getTemplateBlueprint as ReturnType<typeof vi.fn>).mockReturnValue(
      maisonBlueprint,
    );
  });

  it("seeds NavMenu rows for all 5 slots when picking maison template", async () => {
    await service.pickTemplate("t1", {
      templateSlug: "maison",
      resetBranding: false,
    });

    const slotsSeeded = mockNavRepo.upsert.mock.calls.map(
      (c: unknown[]) => c[1] as string,
    );
    expect(slotsSeeded).toEqual(
      expect.arrayContaining([
        "header-primary",
        "mobile-drawer",
        "footer-config",
        "footer-1",
        "footer-2",
      ]),
    );
    expect(slotsSeeded).toHaveLength(5);
  });

  it("seeds SiteLayout rows for the home/products-index/product-detail/offers/cart scopes", async () => {
    await service.pickTemplate("t1", {
      templateSlug: "maison",
      resetBranding: false,
    });

    const scopesSeeded = mockLayoutsRepo.upsertDraft.mock.calls.map(
      (c: unknown[]) => (c[1] as { scope: string }).scope,
    );
    expect(scopesSeeded).toEqual(
      expect.arrayContaining([
        "home",
        "products-index",
        "product-detail",
        "offers",
        "cart",
      ]),
    );
  });

  it("preserves existing NavMenu rows when resetBranding=false", async () => {
    mockNavRepo.findBySlot.mockImplementation((_t: string, slot: string) =>
      slot === "header-primary"
        ? Promise.resolve({ id: "nm1", tenantId: "t1", slot, items: {} })
        : Promise.resolve(null),
    );

    await service.pickTemplate("t1", {
      templateSlug: "maison",
      resetBranding: false,
    });

    const slotsSeeded = mockNavRepo.upsert.mock.calls.map(
      (c: unknown[]) => c[1] as string,
    );
    expect(slotsSeeded).not.toContain("header-primary");
    expect(slotsSeeded).toContain("footer-config");
  });

  it("overwrites existing NavMenu rows when resetBranding=true", async () => {
    mockNavRepo.findBySlot.mockResolvedValue({
      id: "nm1",
      tenantId: "t1",
      slot: "header-primary",
      items: {},
    });

    await service.pickTemplate("t1", {
      templateSlug: "maison",
      resetBranding: true,
    });

    const slotsSeeded = mockNavRepo.upsert.mock.calls.map(
      (c: unknown[]) => c[1] as string,
    );
    expect(slotsSeeded).toContain("header-primary");
    expect(slotsSeeded).toHaveLength(5);
  });

  it("does not seed NavMenu rows when blueprint is unknown", async () => {
    (mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
      templateRow("not-a-real-template"),
    );
    (getTemplateBlueprint as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await service.pickTemplate("t1", {
      templateSlug: "not-a-real-template",
      resetBranding: false,
    });

    expect(mockNavRepo.upsert).not.toHaveBeenCalled();
  });

  it("seeds SiteLayout but not NavMenu when blueprint has only layouts (no nav fields)", async () => {
    // Backwards-compat test: blueprint with layouts but no nav fields.
    // SiteLayout upserts should happen; NavMenu upserts should NOT.
    // This proves layout and nav seeding paths are independent.
    const dummyBlock: BlockNode = {
      id: "blk1",
      kind: "section",
      props: { background: "default" },
      children: [],
    };
    const layoutsOnlyBlueprint: TemplateBlueprint = {
      slug: "layouts-only",
      layouts: {
        home: [dummyBlock],
        "products-index": [dummyBlock],
      },
      // No navConfig, mobileDrawerConfig, footerConfig, footerPrimaryItems, footerSecondaryItems
    };

    (getTemplateBlueprint as ReturnType<typeof vi.fn>).mockReturnValue(
      layoutsOnlyBlueprint,
    );
    (mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
      templateRow("layouts-only"),
    );

    mockNavRepo.upsert.mockClear();
    mockLayoutsRepo.upsertDraft.mockClear();

    await service.pickTemplate("t1", {
      templateSlug: "layouts-only",
      resetBranding: false,
    });

    // SiteLayout rows should be upserted for scopes in the blueprint
    expect(mockLayoutsRepo.upsertDraft).toHaveBeenCalled();
    // NavMenu rows should NOT be upserted because blueprint has no nav fields
    expect(mockNavRepo.upsert).not.toHaveBeenCalled();
  });

  it("seeds NavMenu but not SiteLayout when blueprint has only nav fields (no layouts)", async () => {
    // Backwards-compat test: blueprint with nav fields but no layouts.
    // NavMenu upserts should happen; SiteLayout upserts should NOT.
    // This proves nav and layout seeding paths are independent.
    const navOnlyBlueprint: TemplateBlueprint = {
      slug: "nav-only",
      navConfig: {
        layout: "standard",
        behavior: "sticky",
        items: [],
        mobile: { drawerStyle: "slide-right", showSearch: false },
        showCart: true,
        showSearch: false,
        showAccount: false,
      },
      footerConfig: {
        layout: "columns",
        background: "muted",
        brand: {},
        columns: [],
        socials: [],
        newsletter: { enabled: false },
        legal: { showYear: true, links: [] },
      },
      footerPrimaryItems: [],
      footerSecondaryItems: [],
      // No layouts
    };

    (getTemplateBlueprint as ReturnType<typeof vi.fn>).mockReturnValue(
      navOnlyBlueprint,
    );
    (mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
      templateRow("nav-only"),
    );

    mockNavRepo.upsert.mockClear();
    mockLayoutsRepo.upsertDraft.mockClear();

    await service.pickTemplate("t1", {
      templateSlug: "nav-only",
      resetBranding: false,
    });

    // NavMenu rows should be upserted for slots in the blueprint
    expect(mockNavRepo.upsert).toHaveBeenCalled();
    const slotsSeeded = mockNavRepo.upsert.mock.calls.map(
      (c: unknown[]) => c[1] as string,
    );
    expect(slotsSeeded).toEqual(
      expect.arrayContaining([
        "header-primary",
        "footer-config",
        "footer-1",
        "footer-2",
      ]),
    );
    // SiteLayout rows should NOT be upserted because blueprint has no layouts
    expect(mockLayoutsRepo.upsertDraft).not.toHaveBeenCalled();
  });
});
