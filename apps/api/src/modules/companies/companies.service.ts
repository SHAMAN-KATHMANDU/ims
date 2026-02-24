/**
 * Companies service: business logic for companies; uses repository only.
 */

import type { Prisma } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { NotFoundError } from "@/shared/errors";
import * as companiesRepository from "./companies.repository";

export type CreateCompanyInput = {
  name: string;
  website?: string | null;
  address?: string | null;
  phone?: string | null;
};

export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export type ListCompaniesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "name" | "id";
  sortOrder?: "asc" | "desc";
};

export async function create(tenantId: string, input: CreateCompanyInput) {
  return companiesRepository.createCompany({
    tenantId,
    name: input.name,
    website: input.website ?? null,
    address: input.address ?? null,
    phone: input.phone ?? null,
  });
}

export async function getAll(tenantId: string, query: ListCompaniesQuery) {
  const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
    query as Parameters<typeof getPaginationParams>[0],
  );

  const allowedSortFields = ["createdAt", "updatedAt", "name", "id"];
  const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) ?? {
    name: "asc",
  };

  const where: Prisma.CompanyWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { website: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [totalItems, companies] = await Promise.all([
    companiesRepository.countCompanies(tenantId, where),
    companiesRepository.findCompanies(tenantId, where, orderBy, skip, limit),
  ]);

  return createPaginationResult(companies, totalItems, page, limit);
}

export async function getById(tenantId: string, id: string) {
  const company = await companiesRepository.findCompanyById(tenantId, id);
  if (!company) throw new NotFoundError("Company not found");
  return company;
}

export async function update(
  tenantId: string,
  id: string,
  input: UpdateCompanyInput,
) {
  const existing = await companiesRepository.findCompanyByIdForUpdate(
    tenantId,
    id,
  );
  if (!existing) throw new NotFoundError("Company not found");

  return companiesRepository.updateCompany(id, {
    ...(input.name !== undefined && { name: input.name || existing.name }),
    ...(input.website !== undefined && { website: input.website ?? null }),
    ...(input.address !== undefined && { address: input.address ?? null }),
    ...(input.phone !== undefined && { phone: input.phone ?? null }),
  });
}

export async function deleteCompany(tenantId: string, id: string) {
  const existing = await companiesRepository.findCompanyByIdForUpdate(
    tenantId,
    id,
  );
  if (!existing) throw new NotFoundError("Company not found");
  await companiesRepository.softDeleteCompany(id);
}

export async function listForSelect(tenantId: string) {
  return companiesRepository.findCompaniesForSelect(tenantId);
}
