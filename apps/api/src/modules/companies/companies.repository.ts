/**
 * Companies repository: all Prisma access for companies.
 * All queries are tenant-scoped; list/get exclude soft-deleted (deletedAt: null).
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const notDeleted = { deletedAt: null };

export function findCompanies(
  tenantId: string,
  where: Prisma.CompanyWhereInput,
  orderBy: Prisma.CompanyOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  return prisma.company.findMany({
    where: { ...where, tenantId, ...notDeleted },
    orderBy,
    skip,
    take,
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });
}

export function countCompanies(
  tenantId: string,
  where: Prisma.CompanyWhereInput,
) {
  return prisma.company.count({
    where: { ...where, tenantId, ...notDeleted },
  });
}

export function findCompanyById(tenantId: string, id: string) {
  return prisma.company.findFirst({
    where: { id, tenantId, ...notDeleted },
    include: {
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      _count: { select: { deals: true } },
    },
  });
}

export function findCompanyByIdForUpdate(tenantId: string, id: string) {
  return prisma.company.findFirst({
    where: { id, tenantId, ...notDeleted },
  });
}

export function createCompany(data: {
  tenantId: string;
  name: string;
  website?: string | null;
  address?: string | null;
  phone?: string | null;
}) {
  return prisma.company.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      website: data.website ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
    },
  });
}

export function updateCompany(
  id: string,
  data: Partial<{
    name: string;
    website: string | null;
    address: string | null;
    phone: string | null;
  }>,
) {
  return prisma.company.update({
    where: { id },
    data,
  });
}

export function softDeleteCompany(id: string) {
  return prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function findCompaniesForSelect(tenantId: string) {
  return prisma.company.findMany({
    where: { tenantId, ...notDeleted },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 500,
  });
}
