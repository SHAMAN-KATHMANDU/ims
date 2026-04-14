/**
 * Public pages service.
 *
 * Every method asserts the tenant's SiteConfig is websiteEnabled +
 * isPublished, returning 404 (never 403) so we don't leak the existence of
 * unpublished sites. Unknown slugs also return 404.
 */

import sitesRepo from "@/modules/sites/sites.repository";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo, {
  type PublicNavItem,
  type PublicTenantPage,
} from "./public-pages.repository";
import type { ListPublicPagesQuery } from "./public-pages.schema";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

export class PublicPagesService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
  ) {}

  private async ensurePublished(tenantId: string): Promise<void> {
    const config = await this.sites.findConfig(tenantId);
    if (!config || !config.websiteEnabled || !config.isPublished) {
      throw createError("Not found", 404);
    }
  }

  async getPageBySlug(
    tenantId: string,
    slug: string,
  ): Promise<PublicTenantPage> {
    await this.ensurePublished(tenantId);
    const page = await this.repo.findPageBySlug(tenantId, slug);
    if (!page) throw createError("Page not found", 404);
    return page;
  }

  async listPages(
    tenantId: string,
    query: ListPublicPagesQuery,
  ): Promise<PublicNavItem[]> {
    await this.ensurePublished(tenantId);
    return this.repo.listPages(tenantId, { navOnly: query.nav === true });
  }
}

export default new PublicPagesService();
