/**
 * Tenant-scoped site service — lets tenant admins manage their own website
 * content once the platform has enabled the feature for them.
 *
 * All methods take an explicit `tenantId` and assert the website feature is
 * enabled before any mutation; platform-level concerns (enabling the feature,
 * picking domains) are handled elsewhere.
 */

import { Prisma, type SiteTemplate } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/config/logger";
import defaultRepo, { type SiteConfigWithTemplate } from "./sites.repository";
import type {
  UpdateSiteConfigInput,
  PickTemplateInput,
  CreatePageInput,
  UpdatePageInput,
  UpsertBlocksInput,
  UpdateGlobalsInput,
  UpdateThemeInput,
  UpdateSeoInput,
  AnalyticsInput,
} from "./sites.schema";
import { revalidateTenantSite as defaultRevalidate } from "./sites.revalidate";
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import { revalidateSiteLayout } from "@/modules/site-layouts/site-layouts.revalidate";
import pagesRepo from "@/modules/pages/pages.repository";
import { getTemplateBlueprint, type TemplateBlueprint } from "./templates";
import { blankBlueprint } from "./templates/blank";
import {
  autowireBlockTree,
  type AutowireTenantContext,
} from "./template-autowire";
import collectionsRepo from "@/modules/collections/collections.repository";
import bundlesRepo from "@/modules/bundles/bundle.repository";
import type { BlockNode, BlockTree } from "@repo/shared";
import {
  BlockTreeSchema,
  CHROME_SCOPES,
  PAGE_SCOPE_TO_SLUG,
  synthesizeDefaultPagesFromLayouts,
  type BlueprintScope,
} from "@repo/shared";
import {
  synthesizeHeaderBlocks,
  synthesizeFooterBlocks,
} from "./migrations/synthesize-chrome-layout";

type Repo = typeof defaultRepo;
type Revalidate = (tenantId: string) => Promise<void>;

/**
 * Identity fields that live in TenantBusinessProfile, NOT in SiteConfig.branding.
 * When applying a template we must never overwrite these with template defaults —
 * the tenant's logo, name and contact details must survive a template switch.
 */
const BRANDING_IDENTITY_KEYS = [
  "name",
  "tagline",
  "logoUrl",
  "faviconUrl",
] as const;

/**
 * Convert a BlueprintScope to a human-readable title for the Pages list.
 */
function humanizeScope(scope: string): string {
  const scopeNames: Record<string, string> = {
    header: "Header",
    footer: "Footer",
    home: "Home",
    "products-index": "Products",
    "product-detail": "Product detail",
    offers: "Offers",
    cart: "Cart",
    "blog-index": "Blog",
    "blog-post": "Blog post",
    contact: "Contact",
    page: "Page",
    "404": "Not found",
  };
  return scopeNames[scope] || scope;
}

/**
 * Strip identity fields from a raw branding JSON object before it is written
 * to SiteConfig. Handles null safely (returns null).
 */
function stripIdentityFromBranding(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const result = { ...(raw as Record<string, unknown>) };
  for (const key of BRANDING_IDENTITY_KEYS) {
    delete result[key];
  }
  return result;
}

/**
 * Apply the autowire pass to every block tree on a blueprint —
 * `layouts` (chrome + page scopes) and `defaultPages[].blocks`. The
 * result is a NEW blueprint object so the original in-code constant
 * stays pristine across applies.
 */
function applyAutowireToBlueprint(
  blueprint: TemplateBlueprint,
  ctx: AutowireTenantContext,
): TemplateBlueprint {
  const wiredLayouts: TemplateBlueprint["layouts"] = {};
  for (const [scope, blocks] of Object.entries(blueprint.layouts ?? {})) {
    if (!blocks) continue;
    wiredLayouts[scope as BlueprintScope] = autowireBlockTree(blocks, ctx);
  }
  const wiredPages = Array.isArray(blueprint.defaultPages)
    ? blueprint.defaultPages.map((page) => ({
        ...page,
        blocks: page.blocks ? autowireBlockTree(page.blocks, ctx) : page.blocks,
      }))
    : blueprint.defaultPages;
  return {
    ...blueprint,
    layouts: wiredLayouts,
    defaultPages: wiredPages,
  };
}

export class SitesService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly revalidate: Revalidate = defaultRevalidate,
  ) {}

  /**
   * Assert that the website feature is enabled for the tenant.
   * If SiteConfig doesn't exist, auto-create it with websiteEnabled=true.
   * If websiteEnabled is explicitly false, throw 403.
   */
  private async assertEnabled(
    tenantId: string,
  ): Promise<SiteConfigWithTemplate> {
    let config = await this.repo.findConfig(tenantId);

    // Auto-create if missing. Seed `themeTokens` from the blank-blueprint
    // tokens so the Design tab and the public renderer both have a valid
    // tokens object to render against, even before the tenant has explicitly
    // applied a template. Without this seed, tenants who land on the editor
    // pre-template see empty Design/font fallbacks and the public site emits
    // no CSS variables.
    if (!config) {
      logger.info(`Auto-creating SiteConfig for tenant ${tenantId} (missing)`);
      config = await this.repo.upsertConfig(tenantId, {
        websiteEnabled: true,
        themeTokens: blankBlueprint.defaultThemeTokens as unknown as Record<
          string,
          unknown
        >,
      });
      return config;
    }

    // Throw if explicitly disabled
    if (!config.websiteEnabled) {
      throw createError(
        "Website feature is disabled for this tenant. Contact your platform administrator.",
        403,
      );
    }

    return config;
  }

  async getConfig(tenantId: string): Promise<SiteConfigWithTemplate> {
    return this.assertEnabled(tenantId);
  }

  async updateConfig(
    tenantId: string,
    input: UpdateSiteConfigInput,
  ): Promise<SiteConfigWithTemplate> {
    await this.assertEnabled(tenantId);

    const toJson = (
      v: Record<string, unknown> | null | undefined,
    ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
      if (v === undefined) return undefined;
      if (v === null) return Prisma.JsonNull;
      return v as Prisma.InputJsonValue;
    };

    const data: Prisma.SiteConfigUpdateInput = {};
    if (input.branding !== undefined) data.branding = toJson(input.branding);
    if (input.contact !== undefined) data.contact = toJson(input.contact);
    if (input.features !== undefined) data.features = toJson(input.features);
    if (input.seo !== undefined) data.seo = toJson(input.seo);
    if (input.themeTokens !== undefined)
      data.themeTokens = toJson(input.themeTokens);
    if (input.currency !== undefined) data.currency = input.currency;

    const result = await this.repo.updateConfig(tenantId, data);
    await this.revalidate(tenantId);
    return result;
  }

  async listTemplates(tenantId: string): Promise<SiteTemplate[]> {
    // Gate the template catalog on the feature flag too, so tenants who can't
    // use the website feature don't see templates they can't apply.
    await this.assertEnabled(tenantId);
    return this.repo.listActiveTemplates();
  }

  async pickTemplate(
    tenantId: string,
    input: PickTemplateInput,
    requestId?: string,
  ): Promise<SiteConfigWithTemplate> {
    const current = await this.assertEnabled(tenantId);

    const template = await this.repo.findTemplateBySlug(input.templateSlug);
    if (!template) throw createError("Template not found", 404);
    if (!template.isActive) throw createError("Template is not active", 400);

    // First apply = this tenant has never picked a template. In that case
    // there's no prior published layout for `seedLayoutsFromBlueprint` to
    // clobber, so default to publishing immediately. Without this, the
    // template only writes draftBlocks and the public site renders nothing
    // until the user finds the Publish button — visually indistinguishable
    // from "Apply did nothing", which has bitten enough tenants to fix.
    const isFirstApply = !current?.templateId;
    const effectiveReset = input.resetBranding === true || isFirstApply;

    // Check for a tenant fork of this template
    const tenantFork = await this.repo.findTenantForkOfTemplate(
      tenantId,
      template.id,
    );

    const data: Prisma.SiteConfigUpdateInput = {
      template: { connect: { id: template.id } },
    };
    if (effectiveReset) {
      // Strip identity fields (name/tagline/logoUrl/faviconUrl) from the
      // template's default branding before writing — those belong to
      // TenantBusinessProfile and must survive a template switch.
      const strippedBranding = stripIdentityFromBranding(
        template.defaultBranding,
      );
      data.branding =
        strippedBranding === null
          ? Prisma.JsonNull
          : (strippedBranding as Prisma.InputJsonValue);
      data.features =
        template.defaultSections === null
          ? Prisma.JsonNull
          : (template.defaultSections as Prisma.InputJsonValue);
    }

    // Resolve blueprint with fork-awareness: prefer tenant fork's layouts/tokens
    const blueprint = getTemplateBlueprint(input.templateSlug, {
      tenantFork,
      canonicalTemplate: template,
    });
    if (blueprint?.defaultThemeTokens) {
      const existingTokens = current?.themeTokens as Record<
        string,
        unknown
      > | null;
      if (!existingTokens || effectiveReset) {
        data.themeTokens =
          blueprint.defaultThemeTokens as unknown as Prisma.InputJsonValue;
      }
    }

    const result = await this.repo.updateConfig(tenantId, data);

    // Seed a SiteLayout row for every scope the blueprint covers. The
    // repository's upsertDraft writes to `draftBlocks`. Re-picking the same
    // template updates the draft idempotently. Re-picking a DIFFERENT
    // template overwrites drafts but preserves the tenant's previously
    // published `blocks` unless they explicitly asked for a reset (or this
    // is their first apply — see effectiveReset above).
    if (blueprint) {
      // Pre-load the tenant's catalogue once and reuse the snapshot for
      // every layout/page seed pass. Without this each scope would hit
      // the DB for collections/bundles separately.
      const autowireCtx = await this.loadAutowireContext(tenantId);
      const wiredBlueprint = applyAutowireToBlueprint(blueprint, autowireCtx);
      // Chrome / dynamic-template scopes (header, footer, 404, product-detail,
      // blog-post, page) stay scope-keyed and are seeded as SiteLayout rows.
      // The user-facing page scopes (home, products-index, offers, cart,
      // blog-index, contact) become real TenantPage rows via the synthesizer
      // below, so they're editable from the Pages list like any custom page.
      await this.seedLayoutsFromBlueprint(
        tenantId,
        wiredBlueprint,
        effectiveReset,
      );
      const blueprintWithSynthesizedPages: TemplateBlueprint = {
        ...wiredBlueprint,
        defaultPages: synthesizeDefaultPagesFromLayouts(wiredBlueprint),
      };
      await this.seedCustomPagesFromBlueprint(
        tenantId,
        blueprintWithSynthesizedPages,
        effectiveReset,
      );
      // Seed the Navigation tab's data store too. Without this the
      // editor's /site/navigation tab is empty even though the rendered
      // template clearly has a populated header/footer.
      await this.seedNavigationFromBlueprint(
        tenantId,
        blueprint,
        effectiveReset,
      );
    }

    await this.revalidate(tenantId);
    return result;
  }

  /**
   * Snapshot of the tenant's IMS the autowire pass needs. Loaded once
   * per Apply so each scope/page seed pass gets the same view of the
   * catalogue (no mid-flight inserts can change which collection is
   * "first").
   */
  private async loadAutowireContext(
    tenantId: string,
  ): Promise<AutowireTenantContext> {
    const collections = await collectionsRepo.list(tenantId);
    // Bundle list shape mirrors the public list endpoint — only active,
    // non-deleted rows. The bundle repo's findMany requires an explicit
    // where shape (see BundleWhere); pass the same one the public
    // service uses.
    const bundles = await bundlesRepo.findMany(
      { tenantId, deletedAt: null, active: true },
      { createdAt: "asc" },
      0,
      24,
    );
    return {
      collections: collections
        .filter((c) => c.isActive)
        .map((c) => ({ id: c.id, slug: c.slug, title: c.title })),
      bundles: bundles.map((b) => ({ id: b.id, slug: b.slug, name: b.name })),
    };
  }

  /**
   * Seed `SiteConfig.navigation` ({ primary, utility, footer }) from the
   * blueprint's PAGE_SCOPES, so the editor's Navigation tab is populated
   * right after Apply.
   *
   * Behaviour:
   *   - `overwriteExisting=true` — replace primary entirely with the
   *     blueprint's items (used on first apply / explicit reset).
   *   - `overwriteExisting=false` with NO existing nav — same as above.
   *   - `overwriteExisting=false` WITH existing nav — preserve every
   *     user-edited item (id/label/href/order) AND additively append
   *     items for any new PAGE_SCOPE the template introduces. This
   *     fixes the round-2 regression where re-applying a template with
   *     new scopes (e.g. blog) silently dropped them because the
   *     all-or-nothing skip kicked in once the user had any nav.
   */
  private async seedNavigationFromBlueprint(
    tenantId: string,
    blueprint: TemplateBlueprint,
    overwriteExisting: boolean,
  ): Promise<void> {
    type PrimaryItem = { id: string; label: string; href: string };

    const NAV_LABELS: Readonly<Partial<Record<BlueprintScope, string>>> = {
      home: "Home",
      "products-index": "Products",
      offers: "Offers",
      cart: "Cart",
      "blog-index": "Blog",
      contact: "Contact",
    };

    // Build the full set of items the blueprint expects.
    const blueprintItems: PrimaryItem[] = [];
    for (const scope of Object.keys(PAGE_SCOPE_TO_SLUG) as BlueprintScope[]) {
      const blocks = blueprint.layouts?.[scope];
      if (!blocks || blocks.length === 0) continue;
      const slug = PAGE_SCOPE_TO_SLUG[scope]!;
      const href = slug === "/" ? "/" : `/${slug}`;
      blueprintItems.push({
        id: scope,
        label: NAV_LABELS[scope] ?? scope,
        href,
      });
    }

    const existing = await this.repo.findConfig(tenantId);
    const existingNav = existing?.navigation as
      | {
          primary?: PrimaryItem[];
          utility?: PrimaryItem[];
          footer?: Array<{ id: string; title: string; items: PrimaryItem[] }>;
        }
      | null
      | undefined;

    const userPrimary = Array.isArray(existingNav?.primary)
      ? existingNav!.primary!
      : [];

    let primary: PrimaryItem[];
    if (overwriteExisting || userPrimary.length === 0) {
      primary = blueprintItems;
    } else {
      // Merge: keep user's order/labels for items they already have,
      // append any blueprint scopes the user is missing. Identity is
      // BlueprintScope id (e.g. "home", "blog-index"), which the
      // synthesizer always emits and the user's nav items inherit.
      const userIds = new Set(userPrimary.map((i) => i.id));
      const additions = blueprintItems.filter((i) => !userIds.has(i.id));
      primary = [...userPrimary, ...additions];
    }

    const navigation = {
      primary,
      utility: existingNav?.utility ?? [],
      footer: existingNav?.footer ?? [],
    };

    await this.repo.updateConfig(tenantId, {
      navigation: navigation as unknown as Prisma.InputJsonValue,
    });
  }

  /**
   * Seed draft SiteLayout rows from a template blueprint. When
   * `publishNow` is true (e.g. the tenant explicitly reset to defaults),
   * the blueprint is written straight to `blocks` so the site reflects
   * the new template on next page load; otherwise it lands in
   * `draftBlocks` and the tenant has to hit Publish in the editor.
   *
   * For each scope in BLUEPRINT_SCOPES, if the blueprint provides a layout,
   * it is validated and seeded. If the blueprint omits the scope, an empty
   * layout ([]) is seeded instead. This ensures all scopes have consistent
   * rows in the database, even during the Phase 3 transition when some
   * templates may not yet provide header/footer layouts.
   */
  private async seedLayoutsFromBlueprint(
    tenantId: string,
    blueprint: TemplateBlueprint,
    publishNow: boolean,
  ): Promise<void> {
    // Iterate only chrome / dynamic-template scopes here. The user-facing page
    // scopes (home, products-index, offers, cart, blog-index, contact) are
    // seeded as TenantPage rows by seedCustomPagesFromBlueprint instead.
    for (const scope of CHROME_SCOPES) {
      // Use blueprint's layout if provided; fall back to empty array for missing scopes.
      const blocks = blueprint.layouts?.[scope] ?? [];

      // Validate before write — the editor save path also validates, so an
      // invalid template would round-trip through the DB and surface as a
      // 400 on the user's first save (silent corruption from their POV).
      // Failing loudly here makes a bad blueprint a deployment-time bug.
      const parsed = BlockTreeSchema.safeParse(blocks);
      if (!parsed.success) {
        throw createError(
          `Template "${blueprint.slug}" layout "${scope}" failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown"}`,
          500,
        );
      }
      const json = parsed.data as unknown as Prisma.InputJsonValue;

      if (publishNow) {
        // Write to both draft and published so the site reflects the new
        // template immediately AND the editor opens on the same tree.
        await siteLayoutsRepo.upsertDraft(
          tenantId,
          { scope, pageId: null },
          json,
        );
        await siteLayoutsRepo.publishDraft(tenantId, { scope, pageId: null });
      } else {
        await siteLayoutsRepo.upsertDraft(
          tenantId,
          { scope, pageId: null },
          json,
        );
      }

      // Phase 5 — Upsert scope page so it appears in the Pages list
      await pagesRepo.upsertScopePage(tenantId, scope, {
        title: humanizeScope(scope),
        slug: scope,
      });

      await revalidateSiteLayout(tenantId, scope);
    }
  }

  /**
   * Seed custom pages (kind="page") from a template's defaultPages array.
   * Idempotent: each page is upserted by (tenantId, kind, slug).
   *
   * When overwriteExisting=true (e.g., resetBranding=true), the page and layout
   * are updated to match the template's current blocks. Otherwise, existing user
   * edits are preserved (first apply only seeds new pages).
   */
  private async seedCustomPagesFromBlueprint(
    tenantId: string,
    blueprint: TemplateBlueprint,
    overwriteExisting: boolean,
  ): Promise<void> {
    // `defaultPages` is loaded from the SiteTemplate row, which is JSON. Older
    // rows (and the platform seed prior to Phase 10H) wrote a legacy flag-map
    // shape like `{ home: true, products: true }`; the apply path expects
    // `TemplatePageDefinition[]`. Treat anything that isn't a real array as
    // "no custom pages" instead of crashing on a non-iterable.
    if (
      !blueprint.defaultPages ||
      !Array.isArray(blueprint.defaultPages) ||
      blueprint.defaultPages.length === 0
    ) {
      return;
    }

    for (const pageDef of blueprint.defaultPages) {
      // Validate the page definition
      if (!pageDef.slug || !pageDef.title) {
        logger.warn(
          `Skipping invalid custom page in blueprint "${blueprint.slug}": missing slug or title`,
        );
        continue;
      }

      // Upsert the TenantPage row
      const page = await pagesRepo.upsertCustomPage(
        tenantId,
        {
          slug: pageDef.slug,
          title: pageDef.title,
          navOrder: pageDef.navOrder,
          description: pageDef.description,
          seoTitle: pageDef.meta?.seoTitle,
          seoDescription: pageDef.meta?.seoDescription,
        },
        overwriteExisting,
      );

      // Seed the SiteLayout for this custom page
      const blocks = pageDef.blocks ?? [];
      const parsed = BlockTreeSchema.safeParse(blocks);
      if (!parsed.success) {
        throw createError(
          `Template "${blueprint.slug}" custom page "${pageDef.slug}" failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown"}`,
          500,
        );
      }
      const json = parsed.data as unknown as Prisma.InputJsonValue;

      if (overwriteExisting) {
        // Update both draft and published for full reset
        await siteLayoutsRepo.upsertDraft(
          tenantId,
          { scope: "page", pageId: page.id },
          json,
        );
        // Only publish if explicitly resetting
        await siteLayoutsRepo.publishDraft(tenantId, {
          scope: "page",
          pageId: page.id,
        });
      } else {
        // Idempotent: only seed draft on first apply
        await siteLayoutsRepo.upsertDraft(
          tenantId,
          { scope: "page", pageId: page.id },
          json,
        );
      }

      await revalidateSiteLayout(tenantId, "page");
    }
  }

  async publish(tenantId: string): Promise<SiteConfigWithTemplate> {
    const current = await this.assertEnabled(tenantId);

    if (!current.templateId) {
      throw createError("Pick a template before publishing your site.", 400);
    }

    // Atomically promote all draft layouts and flip config in one transaction
    const { siteConfig } = await this.repo.publishAllDrafts(tenantId);
    await this.revalidate(tenantId);
    return siteConfig;
  }

  async unpublish(tenantId: string): Promise<SiteConfigWithTemplate> {
    const current = await this.assertEnabled(tenantId);
    const result = await this.repo.updateConfig(tenantId, {
      isPublished: false,
    });
    await this.revalidate(tenantId);
    return result;
  }

  // ——— PAGES ———

  async listPages(tenantId: string) {
    const config = await this.assertEnabled(tenantId);
    // For now, pages are accessed via SiteLayout rows where pageId is not null.
    // Future implementation can add a dedicated SitePage table if needed.
    return [];
  }

  async getPage(tenantId: string, _pageId: string) {
    const config = await this.assertEnabled(tenantId);
    // Placeholder: fetch page metadata and blocks from SiteLayout
    throw createError("Not implemented", 501);
  }

  async createPage(tenantId: string, _input: CreatePageInput) {
    const config = await this.assertEnabled(tenantId);
    // Placeholder: create a custom page and seed SiteLayout with empty blocks
    throw createError("Not implemented", 501);
  }

  async updatePage(tenantId: string, _pageId: string, _input: UpdatePageInput) {
    const config = await this.assertEnabled(tenantId);
    throw createError("Not implemented", 501);
  }

  async deletePage(tenantId: string, _pageId: string) {
    const config = await this.assertEnabled(tenantId);
    throw createError("Not implemented", 501);
  }

  // ——— BLOCKS ———

  async upsertBlocks(
    tenantId: string,
    input: UpsertBlocksInput,
  ): Promise<BlockTree> {
    const config = await this.assertEnabled(tenantId);

    const scope = input.scope || "home";
    const blocks = input.blocks as unknown as Prisma.InputJsonValue;
    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope, pageId: input.pageId },
      blocks,
    );
    await revalidateSiteLayout(tenantId, scope);
    return input.blocks;
  }

  async addBlock(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      block: BlockNode;
    },
  ): Promise<BlockTree> {
    const config = await this.assertEnabled(tenantId);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;
    const updated = [...current, input.block];

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  async updateBlock(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      blockId: string;
      props?: Record<string, unknown>;
      style?: Record<string, unknown> | null;
      visibility?: Record<string, unknown>;
    },
  ): Promise<BlockTree> {
    const config = await this.assertEnabled(tenantId);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;

    const updated = current.map((block: BlockNode) => {
      if (block.id === input.blockId) {
        return {
          ...block,
          ...(input.props !== undefined && { props: input.props }),
          ...(input.style !== undefined && { style: input.style }),
          ...(input.visibility !== undefined && {
            visibility: input.visibility,
          }),
        };
      }
      return block;
    });

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  async deleteBlock(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      blockId: string;
    },
  ): Promise<BlockTree> {
    const config = await this.assertEnabled(tenantId);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;
    const updated = current.filter(
      (block: BlockNode) => block.id !== input.blockId,
    );

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  async reorderBlocks(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      blockIds: string[];
    },
  ): Promise<BlockTree> {
    const config = await this.assertEnabled(tenantId);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;

    // Reorder blocks according to blockIds
    const blockMap = new Map(current.map((b: BlockNode) => [b.id, b]));
    const updated: BlockTree = [];
    for (const id of input.blockIds) {
      const block = blockMap.get(id);
      if (block) {
        updated.push(block);
      }
    }
    // Append any blocks that weren't in the reorder list (shouldn't happen in normal flow)
    for (const block of current) {
      if (!updated.find((b) => b.id === block.id)) {
        updated.push(block);
      }
    }

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  // ——— CHROME SYNTHESIS (Phase 5) ———

  /**
   * Eagerly synthesize header/footer SiteLayouts from NavMenu rows when
   * an existing tenant (pre-Phase 3) first requests chrome. Idempotent:
   * re-running on a tenant that already has header/footer rows is a no-op.
   *
   * Loads NavMenu rows, reads the template blueprint, and synthesizes
   * BlockNode arrays via synthesizeHeaderBlocks / synthesizeFooterBlocks.
   *
   * This is called on first access to header/footer layouts to populate
   * the database. Subsequent accesses use the upserted rows.
   */
  async ensureChromeSynthesized(
    tenantId: string,
    scope: "header" | "footer",
  ): Promise<void> {
    // Check if the row already exists
    const existing = await siteLayoutsRepo.findByKey(tenantId, {
      scope,
      pageId: null,
    });
    if (existing) {
      return; // Already synthesized or manually created
    }

    // Load the tenant's site config to get the template slug
    const config = await this.repo.findConfig(tenantId);
    if (!config || !config.templateId) {
      // No template assigned — fall back to empty layout
      const emptyBlocks: BlockNode[] = [];
      const json = emptyBlocks as unknown as Prisma.InputJsonValue;
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope, pageId: null },
        json,
      );
      return;
    }

    // Get the template blueprint for fallback blocks
    const template = config.template as SiteTemplate | null;
    if (!template) {
      const emptyBlocks: BlockNode[] = [];
      const json = emptyBlocks as unknown as Prisma.InputJsonValue;
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope, pageId: null },
        json,
      );
      return;
    }

    // Check for a tenant fork of this template
    const tenantFork = await this.repo.findTenantForkOfTemplate(
      tenantId,
      template.id,
    );

    // Resolve blueprint with fork-awareness: prefer tenant fork's layouts/tokens
    const blueprint = getTemplateBlueprint(template.slug, {
      tenantFork,
      canonicalTemplate: template,
    });

    // NavMenu table is no longer the source of truth (dropped in Phase 9).
    // Synthesize blocks from template blueprint only.
    let blocks: BlockNode[];
    if (scope === "header") {
      blocks = synthesizeHeaderBlocks({
        navConfig: null,
        mobileDrawerConfig: null,
        footerConfig: null,
        templateHeaderFallback: blueprint?.layouts?.header,
      });
    } else {
      // scope === "footer"
      blocks = synthesizeFooterBlocks({
        footerConfig: null,
        footerPrimaryItems: null,
        footerSecondaryItems: null,
        templateFooterFallback: blueprint?.layouts?.footer,
      });
    }

    // Validate the synthesized blocks
    const validation = BlockTreeSchema.safeParse(blocks);
    if (!validation.success) {
      throw createError(
        `Failed to synthesize ${scope} layout: ${validation.error.issues[0]?.message ?? "unknown"}`,
        500,
      );
    }

    // Upsert both draft and published to the database
    const json = validation.data as unknown as Prisma.InputJsonValue;
    await siteLayoutsRepo.upsertDraft(tenantId, { scope, pageId: null }, json);
    // Mark as published so it appears on the live site
    await siteLayoutsRepo.publishDraft(tenantId, { scope, pageId: null });

    // Revalidate the layout
    await revalidateSiteLayout(tenantId, scope);
  }

  // ——— GLOBALS (Header/Footer) ———

  async getGlobals(tenantId: string) {
    const config = await this.assertEnabled(tenantId);

    // Trigger eager synthesis for header and footer if they don't exist
    await this.ensureChromeSynthesized(tenantId, "header");
    await this.ensureChromeSynthesized(tenantId, "footer");

    const headerLayout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: "header",
      pageId: null,
    });
    const footerLayout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: "footer",
      pageId: null,
    });

    return {
      header: (headerLayout?.draftBlocks ??
        headerLayout?.blocks ??
        []) as unknown as BlockTree,
      footer: (footerLayout?.draftBlocks ??
        footerLayout?.blocks ??
        []) as unknown as BlockTree,
    };
  }

  async updateGlobals(tenantId: string, input: UpdateGlobalsInput) {
    const config = await this.assertEnabled(tenantId);

    if (input.header !== undefined) {
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope: "header", pageId: null },
        input.header as unknown as Prisma.InputJsonValue,
      );
      await revalidateSiteLayout(tenantId, "header");
    }

    if (input.footer !== undefined) {
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope: "footer", pageId: null },
        input.footer as unknown as Prisma.InputJsonValue,
      );
      await revalidateSiteLayout(tenantId, "footer");
    }

    return this.getGlobals(tenantId);
  }

  // ——— THEME ———

  async getTheme(tenantId: string) {
    const config = await this.assertEnabled(tenantId);
    return config.themeTokens ?? {};
  }

  async updateTheme(tenantId: string, input: UpdateThemeInput) {
    const config = await this.assertEnabled(tenantId);

    const current = (config.themeTokens ?? {}) as Record<string, unknown>;
    const merged = {
      colors: {
        ...((current.colors as Record<string, unknown>) ?? {}),
        ...input.colors,
      },
      typography: {
        ...((current.typography as Record<string, unknown>) ?? {}),
        ...input.typography,
      },
      layout: {
        ...((current.layout as Record<string, unknown>) ?? {}),
        ...input.layout,
      },
    };

    const result = await this.repo.updateConfig(tenantId, {
      themeTokens: merged as Prisma.InputJsonValue,
    });
    await this.revalidate(tenantId);
    return result.themeTokens ?? {};
  }

  // ——— SEO ———

  async getSeo(tenantId: string) {
    const config = await this.assertEnabled(tenantId);
    return config.seo ?? {};
  }

  async updateSeo(tenantId: string, input: UpdateSeoInput) {
    const config = await this.assertEnabled(tenantId);

    const current = (config.seo ?? {}) as Record<string, unknown>;
    const merged = {
      ...current,
      ...(input.siteTitle !== undefined && { siteTitle: input.siteTitle }),
      ...(input.siteDescription !== undefined && {
        siteDescription: input.siteDescription,
      }),
      ...(input.gaId !== undefined && { gaId: input.gaId }),
      ...(input.robots !== undefined && { robots: input.robots }),
    };

    const result = await this.repo.updateConfig(tenantId, {
      seo: merged as Prisma.InputJsonValue,
    });
    await this.revalidate(tenantId);
    return result.seo ?? {};
  }

  // ——— ANALYTICS ———

  async getAnalytics(tenantId: string): Promise<Record<string, unknown>> {
    const config = await this.assertEnabled(tenantId);
    return (config.analytics ?? {}) as Record<string, unknown>;
  }

  async updateAnalytics(
    tenantId: string,
    input: AnalyticsInput,
  ): Promise<Record<string, unknown>> {
    const config = await this.assertEnabled(tenantId);

    const current = (config.analytics ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...current };
    if (input.ga4MeasurementId !== undefined)
      merged.ga4MeasurementId = input.ga4MeasurementId;
    if (input.gtmContainerId !== undefined)
      merged.gtmContainerId = input.gtmContainerId;
    if (input.metaPixelId !== undefined) merged.metaPixelId = input.metaPixelId;
    if (input.consentMode !== undefined) merged.consentMode = input.consentMode;

    const result = await this.repo.updateConfig(tenantId, {
      analytics: merged as Prisma.InputJsonValue,
    });
    await this.revalidate(tenantId);
    return (result.analytics ?? {}) as Record<string, unknown>;
  }
}

export default new SitesService();
