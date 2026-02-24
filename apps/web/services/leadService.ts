import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";
import { DEFAULT_PAGINATION_META } from "@/lib/apiTypes";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "LOST"
  | "CONVERTED";

export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  status: LeadStatus;
  source?: string | null;
  notes?: string | null;
  assignedToId: string;
  createdById: string;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; username: string };
  creator?: { id: string; username: string };
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: LeadStatus;
  source?: string;
  assignedToId?: string;
}

export interface PaginatedLeadsResponse {
  data: Lead[];
  pagination: PaginationMeta;
}

export interface CreateLeadData {
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status?: LeadStatus;
  source?: string;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateLeadData {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status?: LeadStatus;
  source?: string;
  notes?: string;
  assignedToId?: string;
}

export async function getLeads(
  params: LeadListParams = {},
): Promise<PaginatedLeadsResponse> {
  const res = await api.get<{ data?: Lead[]; pagination?: PaginationMeta }>(
    "/leads",
    { params },
  );
  return {
    data: res.data?.data ?? [],
    pagination: res.data?.pagination ?? DEFAULT_PAGINATION_META,
  };
}

export async function getLeadById(id: string): Promise<{ lead: Lead }> {
  const res = await api.get<{ data?: { lead: Lead } }>(`/leads/${id}`);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createLead(
  data: CreateLeadData,
): Promise<{ lead: Lead }> {
  const res = await api.post<{ data?: { lead: Lead } }>("/leads", data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updateLead(
  id: string,
  data: UpdateLeadData,
): Promise<{ lead: Lead }> {
  const res = await api.put<{ data?: { lead: Lead } }>(`/leads/${id}`, data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

export async function convertLead(
  id: string,
  data?: {
    contactId?: string;
    dealName?: string;
    dealValue?: number;
    pipelineId?: string;
  },
): Promise<{ lead: Lead; contact: unknown; deal: unknown }> {
  const res = await api.post<{
    data?: { lead: Lead; contact: unknown; deal: unknown };
  }>(`/leads/${id}/convert`, data ?? {});
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function assignLead(
  id: string,
  assignedToId: string,
): Promise<{ lead: Lead }> {
  const res = await api.post<{ data?: { lead: Lead } }>(`/leads/${id}/assign`, {
    assignedToId,
  });
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}
