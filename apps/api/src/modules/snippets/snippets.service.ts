/**
 * Snippets service — Phase 5 reusable block sub-trees.
 *
 * The service does not snapshot to a versions table (Phase 4 versioning
 * is per-entity; SiteSnippet versions can be added later if needed). It
 * does fire a tenant-wide site revalidation on every mutation so any
 * page that references a snippet picks up the new content.
 */

import { Prisma } from "@prisma/client";
import sitesRepo from "@/modules/sites/sites.repository";
import { revalidateTenantSite as defaultRevalidate } from "@/modules/sites/sites.revalidate";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo, {
  type SnippetListItem,
  type SnippetRow,
} from "./snippets.repository";
import type {
  CreateSnippetInput,
  ListSnippetsQuery,
  UpdateSnippetInput,
} from "./snippets.schema";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;
type Revalidate = (tenantId: string) => Promise<void>;

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export class SnippetsService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
    private readonly revalidate: Revalidate = defaultRevalidate,
  ) {}

  private async assertEnabled(tenantId: string): Promise<void> {
    const site = await this.sites.findConfig(tenantId);
    if (!site || !site.websiteEnabled) {
      throw createError("Website feature is disabled for this tenant.", 403);
    }
  }

  async list(
    tenantId: string,
    query: ListSnippetsQuery,
  ): Promise<{
    snippets: SnippetListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.assertEnabled(tenantId);
    const { rows, total } = await this.repo.list({
      tenantId,
      page: query.page,
      limit: query.limit,
      category: query.category,
      search: query.search,
    });
    return { snippets: rows, total, page: query.page, limit: query.limit };
  }

  async get(tenantId: string, id: string): Promise<SnippetRow> {
    await this.assertEnabled(tenantId);
    const row = await this.repo.getById(tenantId, id);
    if (!row) throw createError("Snippet not found", 404);
    return row;
  }

  async create(
    tenantId: string,
    input: CreateSnippetInput,
  ): Promise<SnippetRow> {
    await this.assertEnabled(tenantId);
    try {
      const snippet = await this.repo.create(tenantId, {
        slug: input.slug,
        title: input.title,
        category: input.category ?? null,
        body: (input.body ?? []) as unknown as Prisma.InputJsonValue,
      });
      await this.revalidate(tenantId).catch(() => undefined);
      return snippet;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A snippet with this slug already exists", 409);
      }
      throw err;
    }
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateSnippetInput,
  ): Promise<SnippetRow> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getById(tenantId, id);
    if (!existing) throw createError("Snippet not found", 404);

    const data: Prisma.SiteSnippetUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.title !== undefined) data.title = input.title;
    if (input.category !== undefined) data.category = input.category ?? null;
    if (input.body !== undefined) {
      data.body = input.body as unknown as Prisma.InputJsonValue;
    }
    try {
      const snippet = await this.repo.update(tenantId, id, data);
      await this.revalidate(tenantId).catch(() => undefined);
      return snippet;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A snippet with this slug already exists", 409);
      }
      throw err;
    }
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getById(tenantId, id);
    if (!existing) throw createError("Snippet not found", 404);
    await this.repo.delete(tenantId, id);
    await this.revalidate(tenantId).catch(() => undefined);
  }
}

export default new SnippetsService();
