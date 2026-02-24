import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";
import { DEFAULT_PAGINATION_META } from "@/lib/apiTypes";

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { contacts: number; deals: number };
}

export interface CompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedCompaniesResponse {
  data: Company[];
  pagination: PaginationMeta;
}

export interface CreateCompanyData {
  name: string;
  website?: string;
  address?: string;
  phone?: string;
}

export interface UpdateCompanyData {
  name?: string;
  website?: string;
  address?: string;
  phone?: string;
}

export async function getCompanies(
  params: CompanyListParams = {},
): Promise<PaginatedCompaniesResponse> {
  const res = await api.get<{ data?: Company[]; pagination?: PaginationMeta }>(
    "/companies",
    { params },
  );
  return {
    data: res.data?.data ?? [],
    pagination: res.data?.pagination ?? DEFAULT_PAGINATION_META,
  };
}

export async function getCompanyById(
  id: string,
): Promise<{ company: Company }> {
  const res = await api.get<{ data?: { company: Company } }>(
    `/companies/${id}`,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createCompany(
  data: CreateCompanyData,
): Promise<{ company: Company }> {
  const res = await api.post<{ data?: { company: Company } }>(
    "/companies",
    data,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyData,
): Promise<{ company: Company }> {
  const res = await api.put<{ data?: { company: Company } }>(
    `/companies/${id}`,
    data,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/companies/${id}`);
}

export async function listCompaniesForSelect(): Promise<{
  companies: Array<{ id: string; name: string }>;
}> {
  const res = await api.get<{
    data?: { companies: Array<{ id: string; name: string }> };
  }>("/companies/list");
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}
