/**
 * Site template service — business logic for template management.
 *
 * Permissions:
 * - Platform admin: can edit canonical templates (ownerTenantId IS NULL)
 * - Tenant admin: can fork, edit own forks, delete own forks
 */

import { createError } from "@/middlewares/errorHandler";
import defaultRepo from "./site-templates.repository";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  ForkTemplateInput,
} from "./site-templates.schema";
import type { SiteTemplate } from "@prisma/client";

type Repo = typeof defaultRepo;

export class SiteTemplatesService {
  constructor(private repo: Repo = defaultRepo) {}

  /**
   * List templates: canonical + tenant's forks, merged.
   */
  async listMerged(tenantId: string): Promise<SiteTemplate[]> {
    return this.repo.listMerged(tenantId);
  }

  /**
   * Get a single template.
   */
  async getById(id: string): Promise<SiteTemplate> {
    const template = await this.repo.getById(id);
    if (!template) throw createError("Template not found", 404);
    return template;
  }

  /**
   * Fork a canonical template for a tenant.
   */
  async fork(
    tenantId: string,
    parentTemplateId: string,
    name: string,
  ): Promise<SiteTemplate> {
    const parent = await this.repo.getById(parentTemplateId);
    if (!parent) throw createError("Parent template not found", 404);
    if (parent.ownerTenantId !== null) {
      throw createError(
        "Cannot fork a fork — only canonical templates can be forked",
        400,
      );
    }

    // Check if tenant already has a fork of this template
    const existing = await this.repo.getTenantFork(tenantId, parent.id);
    if (existing) {
      throw createError("Tenant already has a fork of this template", 409);
    }

    return this.repo.fork(tenantId, parentTemplateId, name);
  }

  /**
   * Update a template.
   * Tenant admins can update their own forks.
   * Platform admins can update canonical templates (validated at controller).
   */
  async update(
    id: string,
    tenantId: string | null,
    input: UpdateTemplateInput,
  ): Promise<SiteTemplate> {
    const template = await this.repo.getById(id);
    if (!template) throw createError("Template not found", 404);

    // If tenant is updating, they can only update their own forks
    if (tenantId && template.ownerTenantId !== tenantId) {
      throw createError("Cannot update a template you do not own", 403);
    }

    return this.repo.update(id, {
      name: input.name,
      description: input.description,
      defaultLayouts: input.defaultLayouts,
      defaultThemeTokens: input.defaultThemeTokens,
      defaultBranding: input.defaultBranding,
      defaultSections: input.defaultSections,
      defaultPages: input.defaultPages,
    });
  }

  /**
   * Delete a fork.
   * Tenant admins can delete their own forks.
   * Cannot delete canonical templates.
   */
  async deleteFork(id: string, tenantId: string): Promise<void> {
    const template = await this.repo.getById(id);
    if (!template) throw createError("Template not found", 404);

    if (template.ownerTenantId === null) {
      throw createError("Cannot delete canonical templates", 403);
    }

    if (template.ownerTenantId !== tenantId) {
      throw createError("Cannot delete a fork owned by another tenant", 403);
    }

    await this.repo.deleteFork(id, tenantId);
  }
}

export default new SiteTemplatesService();
