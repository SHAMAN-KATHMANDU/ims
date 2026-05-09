/**
 * Site template repository — manages canonical templates and per-tenant forks.
 */

import prisma from "@/config/prisma";
import { Prisma, type SiteTemplate } from "@prisma/client";

export class SiteTemplatesRepository {
  /**
   * List canonical templates and tenant-owned forks merged into one list.
   * Canonical rows have ownerTenantId = null.
   * Tenant-owned forks have ownerTenantId = <tenantId>.
   * If a tenant has forked a canonical template, the fork shadows the canonical.
   */
  async listMerged(
    tenantId: string,
  ): Promise<(SiteTemplate & { isFork?: boolean })[]> {
    // Get canonical templates
    const canonical = await prisma.siteTemplate.findMany({
      where: {
        ownerTenantId: null,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    // Get tenant's forks
    const forks = await prisma.siteTemplate.findMany({
      where: {
        ownerTenantId: tenantId,
        isPublic: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // Build a map of canonical by slug for shadowing
    const forksByParentSlug = new Map<string, SiteTemplate>();
    for (const fork of forks) {
      if (fork.parentTemplateId) {
        // If it's a fork, find its parent and use parent's slug
        const parent = await prisma.siteTemplate.findUnique({
          where: { id: fork.parentTemplateId },
          select: { slug: true },
        });
        if (parent) {
          forksByParentSlug.set(parent.slug, fork);
        }
      } else {
        // Custom template (no parent)
        forksByParentSlug.set(fork.slug, fork);
      }
    }

    // Merge: replace canonical with fork if one exists
    const result: (SiteTemplate & { isFork?: boolean })[] = [];
    for (const c of canonical) {
      const fork = forksByParentSlug.get(c.slug);
      if (fork) {
        result.push({ ...fork, isFork: true });
      } else {
        result.push(c);
      }
    }

    // Add any custom templates (forks with no canonical parent that got deleted)
    const customSlugs = new Set<string>();
    for (const fork of forks) {
      if (!fork.parentTemplateId && !result.some((t) => t.slug === fork.slug)) {
        customSlugs.add(fork.slug);
        result.push({ ...fork, isFork: true });
      }
    }

    return result;
  }

  /**
   * Get a single template by ID.
   */
  async getById(id: string): Promise<SiteTemplate | null> {
    return prisma.siteTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Get canonical template by slug.
   */
  async getCanonicalBySlug(slug: string): Promise<SiteTemplate | null> {
    return prisma.siteTemplate.findFirst({
      where: {
        slug,
        ownerTenantId: null,
      },
    });
  }

  /**
   * Get tenant's fork of a canonical template (by parent template id).
   */
  async getTenantFork(
    tenantId: string,
    parentTemplateId: string,
  ): Promise<SiteTemplate | null> {
    return prisma.siteTemplate.findFirst({
      where: {
        parentTemplateId,
        ownerTenantId: tenantId,
      },
    });
  }

  /**
   * Fork a canonical template for a tenant.
   */
  async fork(
    tenantId: string,
    parentTemplateId: string,
    name: string,
  ): Promise<SiteTemplate> {
    const parent = await this.getById(parentTemplateId);
    if (!parent) throw new Error("Parent template not found");

    // Create a new template as a fork
    return prisma.siteTemplate.create({
      data: {
        slug: `fork-${parent.slug}-${Date.now()}`,
        name,
        description: `Forked from ${parent.name}`,
        category: parent.category,
        parentTemplateId,
        ownerTenantId: tenantId,
        defaultBranding: parent.defaultBranding,
        defaultSections: parent.defaultSections,
        defaultPages: parent.defaultPages,
        defaultLayouts: parent.defaultLayouts,
        defaultThemeTokens: parent.defaultThemeTokens,
        isActive: true,
        isPublic: true,
        sortOrder: 999,
      },
    });
  }

  /**
   * Update a template (canonical or fork).
   * Canonical updates require platformAdmin role (handled at controller level).
   */
  async update(
    id: string,
    data: Prisma.SiteTemplateUpdateInput,
  ): Promise<SiteTemplate> {
    return prisma.siteTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a fork (tenant-owned template).
   * Cannot delete canonical templates (ownerTenantId IS NULL).
   */
  async deleteFork(id: string, tenantId: string): Promise<void> {
    const template = await this.getById(id);
    if (!template) throw new Error("Template not found");
    if (template.ownerTenantId !== tenantId) {
      throw new Error("Cannot delete fork owned by another tenant");
    }

    await prisma.siteTemplate.delete({
      where: { id },
    });
  }
}

export default new SiteTemplatesRepository();
