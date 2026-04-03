import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";

export interface CrmSource {
  id: string;
  name: string;
  createdAt: string;
}

export interface CrmJourneyType {
  id: string;
  name: string;
  createdAt: string;
}

// ── Sources ──────────────────────────────────────────────────────────────────

export interface GetCrmSourcesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CrmSourcesResponse {
  sources: CrmSource[];
  pagination?: PaginationMeta;
}

export async function getCrmSources(
  params?: GetCrmSourcesParams,
): Promise<CrmSourcesResponse> {
  const res = await api.get<CrmSourcesResponse>("/crm-settings/sources", {
    params,
  });
  return res.data;
}

export async function createCrmSource(
  name: string,
): Promise<{ source: CrmSource }> {
  const res = await api.post("/crm-settings/sources", { name });
  return res.data;
}

export async function updateCrmSource(
  id: string,
  name: string,
): Promise<{ source: CrmSource }> {
  const res = await api.put(`/crm-settings/sources/${id}`, { name });
  return res.data;
}

export async function deleteCrmSource(id: string): Promise<void> {
  await api.delete(`/crm-settings/sources/${id}`);
}

// ── Journey Types ─────────────────────────────────────────────────────────────

export interface GetCrmJourneyTypesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CrmJourneyTypesResponse {
  journeyTypes: CrmJourneyType[];
  pagination?: PaginationMeta;
}

export async function getCrmJourneyTypes(
  params?: GetCrmJourneyTypesParams,
): Promise<CrmJourneyTypesResponse> {
  const res = await api.get<CrmJourneyTypesResponse>(
    "/crm-settings/journey-types",
    { params },
  );
  return res.data;
}
