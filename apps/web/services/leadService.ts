import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";

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
  const res = await api.get("/leads", { params });
  return res.data;
}

export async function getLeadById(id: string): Promise<{ lead: Lead }> {
  const res = await api.get(`/leads/${id}`);
  return res.data;
}

export async function createLead(
  data: CreateLeadData,
): Promise<{ lead: Lead }> {
  const res = await api.post("/leads", data);
  return res.data;
}

export async function updateLead(
  id: string,
  data: UpdateLeadData,
): Promise<{ lead: Lead }> {
  const res = await api.put(`/leads/${id}`, data);
  return res.data;
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
  const res = await api.post(`/leads/${id}/convert`, data ?? {});
  return res.data;
}

export async function assignLead(
  id: string,
  assignedToId: string,
): Promise<{ lead: Lead }> {
  const res = await api.post(`/leads/${id}/assign`, { assignedToId });
  return res.data;
}
