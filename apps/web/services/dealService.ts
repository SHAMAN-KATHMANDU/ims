import api from "@/lib/axios";
import type { InternalAxiosRequestConfig } from "axios";
import { isAxiosError } from "axios";
import type { PaginationMeta } from "@/lib/apiTypes";
import { DEFAULT_PAGINATION_META } from "@/lib/apiTypes";

export type DealStatus = "OPEN" | "WON" | "LOST";

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  status: DealStatus;
  expectedCloseDate?: string | null;
  closedAt?: string | null;
  lostReason?: string | null;
  contactId?: string | null;
  memberId?: string | null;
  companyId?: string | null;
  pipelineId: string;
  assignedToId: string;
  leadId?: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  } | null;
  member?: {
    id: string;
    name: string | null;
    phone: string;
    email?: string | null;
  } | null;
  company?: { id: string; name: string } | null;
  pipeline?: { id: string; name: string; stages: unknown };
  assignedTo?: { id: string; username: string };
  tasks?: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    completed: boolean;
    assignedTo?: { id: string; username: string };
  }>;
  activities?: Array<{
    id: string;
    type: string;
    subject?: string | null;
    notes?: string | null;
    activityAt: string;
    creator?: { id: string; username: string };
  }>;
}

export interface DealListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  pipelineId?: string;
  stage?: string;
  status?: DealStatus;
  assignedToId?: string;
}

export interface PaginatedDealsResponse {
  data: Deal[];
  pagination: PaginationMeta;
}

export interface CreateDealData {
  name: string;
  value?: number;
  stage?: string;
  probability?: number;
  status?: DealStatus;
  expectedCloseDate?: string;
  contactId?: string;
  memberId?: string;
  companyId?: string;
  pipelineId?: string;
  assignedToId?: string;
}

export interface UpdateDealData {
  name?: string;
  value?: number;
  stage?: string;
  probability?: number;
  status?: DealStatus;
  expectedCloseDate?: string | null;
  lostReason?: string | null;
  contactId?: string | null;
  memberId?: string | null;
  companyId?: string | null;
  assignedToId?: string;
}

export async function getDeals(
  params: DealListParams = {},
): Promise<PaginatedDealsResponse> {
  const res = await api.get<{ data?: Deal[]; pagination?: PaginationMeta }>(
    "/deals",
    { params },
  );
  return {
    data: res.data?.data ?? [],
    pagination: res.data?.pagination ?? DEFAULT_PAGINATION_META,
  };
}

export async function getDealsKanban(pipelineId?: string): Promise<{
  pipeline: unknown;
  stages: Array<{ stage: string; deals: Deal[] }>;
  deals: Deal[];
}> {
  try {
    const res = await api.get<{
      data?: {
        pipeline: unknown;
        stages: Array<{ stage: string; deals: Deal[] }>;
        deals: Deal[];
      };
    }>("/deals/kanban", {
      params: pipelineId ? { pipelineId } : {},
      skipGlobalErrorToast: true,
    } as unknown as InternalAxiosRequestConfig);
    const payload = res.data?.data;
    return payload ?? { pipeline: null, stages: [], deals: [] };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { pipeline: null, stages: [], deals: [] };
    }
    throw error;
  }
}

export async function getDealById(id: string): Promise<{ deal: Deal }> {
  const res = await api.get<{ data?: { deal: Deal } }>(`/deals/${id}`);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createDeal(
  data: CreateDealData,
): Promise<{ deal: Deal }> {
  const res = await api.post<{ data?: { deal: Deal } }>("/deals", data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updateDeal(
  id: string,
  data: UpdateDealData,
): Promise<{ deal: Deal }> {
  const res = await api.put<{ data?: { deal: Deal } }>(`/deals/${id}`, data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updateDealStage(
  id: string,
  stage: string,
): Promise<{ deal: Deal }> {
  const res = await api.patch<{ data?: { deal: Deal } }>(`/deals/${id}/stage`, {
    stage,
  });
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`/deals/${id}`);
}
