import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";

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
  const res = await api.get("/companies", { params });
  return res.data;
}

export async function getCompanyById(
  id: string,
): Promise<{ company: Company }> {
  const res = await api.get(`/companies/${id}`);
  return res.data;
}

export async function createCompany(
  data: CreateCompanyData,
): Promise<{ company: Company }> {
  const res = await api.post("/companies", data);
  return res.data;
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyData,
): Promise<{ company: Company }> {
  const res = await api.put(`/companies/${id}`, data);
  return res.data;
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/companies/${id}`);
}

export async function listCompaniesForSelect(): Promise<{
  companies: Array<{ id: string; name: string }>;
}> {
  const res = await api.get("/companies/list");
  return res.data;
}
