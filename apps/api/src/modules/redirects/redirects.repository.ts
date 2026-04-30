/**
 * Redirects Repository — sole Prisma importer for this module.
 */

import prisma from "@/config/prisma";
import type { TenantRedirect } from "@prisma/client";
import type { CreateRedirectDto, UpdateRedirectDto } from "./redirects.schema";

export type { TenantRedirect };

export class RedirectsRepository {
  findAll(tenantId: string): Promise<TenantRedirect[]> {
    return prisma.tenantRedirect.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  findActive(tenantId: string): Promise<TenantRedirect[]> {
    return prisma.tenantRedirect.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string, tenantId: string): Promise<TenantRedirect | null> {
    return prisma.tenantRedirect.findFirst({ where: { id, tenantId } });
  }

  findByFromPath(
    tenantId: string,
    fromPath: string,
  ): Promise<TenantRedirect | null> {
    return prisma.tenantRedirect.findUnique({
      where: { tenantId_fromPath: { tenantId, fromPath } },
    });
  }

  create(tenantId: string, data: CreateRedirectDto): Promise<TenantRedirect> {
    return prisma.tenantRedirect.create({
      data: {
        tenantId,
        fromPath: data.fromPath,
        toPath: data.toPath,
        statusCode: data.statusCode,
        isActive: data.isActive,
      },
    });
  }

  update(
    id: string,
    tenantId: string,
    data: UpdateRedirectDto,
  ): Promise<TenantRedirect> {
    return prisma.tenantRedirect.update({
      where: { id },
      data: {
        ...(data.fromPath !== undefined && { fromPath: data.fromPath }),
        ...(data.toPath !== undefined && { toPath: data.toPath }),
        ...(data.statusCode !== undefined && { statusCode: data.statusCode }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  delete(id: string, tenantId: string): Promise<TenantRedirect> {
    void tenantId; // enforced by findFirst in service before delete
    return prisma.tenantRedirect.delete({ where: { id } });
  }

  /**
   * Returns all active redirects as a minimal lookup map for chain
   * detection. Used by the service to validate that adding/updating a rule
   * won't form a cycle.
   */
  async findAllPaths(tenantId: string): Promise<Map<string, string>> {
    const rows = await prisma.tenantRedirect.findMany({
      where: { tenantId, isActive: true },
      select: { fromPath: true, toPath: true },
    });
    return new Map(rows.map((r) => [r.fromPath, r.toPath]));
  }
}

export default new RedirectsRepository();
