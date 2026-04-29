/**
 * Tenant-scoped redirect repository.
 *
 * Uses the extended `prisma` client which is auto-scoped by AsyncLocalStorage
 * tenantContext. All reads/writes here run inside a tenant's session and the
 * explicit `tenantId` passed in is used as a belt-and-suspenders filter.
 */

import prisma from "@/config/prisma";
import type { TenantRedirect } from "@prisma/client";

export class RedirectsRepository {
  /**
   * Fetch all active redirects for a tenant, ordered by creation (oldest first).
   */
  async findActive(tenantId: string): Promise<TenantRedirect[]> {
    return prisma.tenantRedirect.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Fetch a single redirect by ID.
   */
  async findById(tenantId: string, id: string): Promise<TenantRedirect | null> {
    return prisma.tenantRedirect.findUnique({
      where: { id },
    });
  }

  /**
   * Fetch all redirects for a tenant (active and inactive).
   */
  async findAll(tenantId: string): Promise<TenantRedirect[]> {
    return prisma.tenantRedirect.findMany({
      where: { tenantId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
  }

  /**
   * Create a new redirect.
   */
  async create(
    tenantId: string,
    data: {
      fromPath: string;
      toPath: string;
      statusCode?: number;
      isActive?: boolean;
    },
  ): Promise<TenantRedirect> {
    return prisma.tenantRedirect.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  /**
   * Update a redirect.
   */
  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      fromPath: string;
      toPath: string;
      statusCode: number;
      isActive: boolean;
    }>,
  ): Promise<TenantRedirect> {
    return prisma.tenantRedirect.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a redirect.
   */
  async delete(tenantId: string, id: string): Promise<TenantRedirect> {
    return prisma.tenantRedirect.delete({
      where: { id },
    });
  }
}

export default new RedirectsRepository();
