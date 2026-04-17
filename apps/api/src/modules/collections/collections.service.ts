/**
 * Collections service — admin boundary for curated product groupings.
 *
 * All mutations gate on `SiteConfig.websiteEnabled` so tenants on the
 * free plan without a website can't accidentally build collections they
 * can't publish. The tenant-site renderer reads via the public routes.
 */

import { createError } from "@/middlewares/errorHandler";
import sitesRepo from "@/modules/sites/sites.repository";
import defaultRepo, { type CollectionRow } from "./collections.repository";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collections.schema";

type Repo = typeof defaultRepo;

export class CollectionsService {
  constructor(private readonly repo: Repo = defaultRepo) {}

  private async assertEnabled(tenantId: string): Promise<void> {
    const config = await sitesRepo.findConfig(tenantId);
    if (!config) {
      throw createError("Website feature is not enabled for this tenant.", 403);
    }
    if (!config.websiteEnabled) {
      throw createError("Website feature is disabled for this tenant.", 403);
    }
  }

  async list(
    tenantId: string,
  ): Promise<(CollectionRow & { productCount: number })[]> {
    await this.assertEnabled(tenantId);
    // First visit: seed the default trio so the admin doesn't open an
    // empty list. Subsequent lists are a no-op.
    let rows = await this.repo.list(tenantId);
    if (rows.length === 0) {
      await this.ensureDefaults(tenantId);
      rows = await this.repo.list(tenantId);
    }
    const counts = await Promise.all(
      rows.map((r) => this.repo.listProductIds(r.id).then((ids) => ids.length)),
    );
    return rows.map((r, i) => ({ ...r, productCount: counts[i] ?? 0 }));
  }

  async get(
    tenantId: string,
    id: string,
  ): Promise<CollectionRow & { productIds: string[] }> {
    await this.assertEnabled(tenantId);
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw createError("Collection not found", 404);
    const productIds = await this.repo.listProductIds(row.id);
    return { ...row, productIds };
  }

  async create(
    tenantId: string,
    input: CreateCollectionInput,
  ): Promise<CollectionRow> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.findBySlug(tenantId, input.slug);
    if (existing)
      throw createError(
        `A collection with slug "${input.slug}" already exists`,
        409,
      );
    return this.repo.create(tenantId, {
      slug: input.slug,
      title: input.title,
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.sort !== undefined ? { sort: input.sort } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
  }

  async update(
    tenantId: string,
    id: string,
    patch: UpdateCollectionInput,
  ): Promise<CollectionRow> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw createError("Collection not found", 404);
    if (patch.slug && patch.slug !== existing.slug) {
      const clash = await this.repo.findBySlug(tenantId, patch.slug);
      if (clash && clash.id !== id) {
        throw createError(
          `A collection with slug "${patch.slug}" already exists`,
          409,
        );
      }
    }
    return this.repo.update(tenantId, id, {
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.subtitle !== undefined
        ? { subtitle: patch.subtitle ?? null }
        : {}),
      ...(patch.sort !== undefined ? { sort: patch.sort } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw createError("Collection not found", 404);
    await this.repo.delete(tenantId, id);
  }

  async setProducts(
    tenantId: string,
    id: string,
    productIds: string[],
  ): Promise<{ accepted: string[]; skipped: string[] }> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw createError("Collection not found", 404);
    return this.repo.setProducts(tenantId, id, productIds);
  }

  /**
   * Seed the default trio (featured, exclusives, top-picks) if they're
   * missing — idempotent. Called when websiteEnabled flips on.
   */
  async ensureDefaults(tenantId: string): Promise<void> {
    const existing = await this.repo.list(tenantId);
    const bySlug = new Set(existing.map((c) => c.slug));
    const defaults: { slug: string; title: string; sort: number }[] = [
      { slug: "featured", title: "Featured", sort: 10 },
      { slug: "exclusives", title: "Exclusives", sort: 20 },
      { slug: "top-picks", title: "Top Picks", sort: 30 },
    ];
    for (const d of defaults) {
      if (bySlug.has(d.slug)) continue;
      await this.repo
        .create(tenantId, { slug: d.slug, title: d.title, sort: d.sort })
        // Race-safe: if another request seeded the same slug, ignore.
        .catch(() => undefined);
    }
  }
}

export default new CollectionsService();
