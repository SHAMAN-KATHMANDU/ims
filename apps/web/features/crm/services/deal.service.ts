import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";
import type { PipelineStage } from "./pipeline.service";

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
  revisionNo?: number;
  isLatest?: boolean;
  editReason?: string | null;
  editedAt?: string | null;
  editedById?: string | null;
  editedBy?: { id: string; username: string } | null;
  parentDealId?: string | null;
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
  pipeline?: {
    id: string;
    name: string;
    stages: PipelineStage[];
    isDefault: boolean;
  } | null;
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
  lineItems?: Array<{
    id: string;
    productId: string;
    variationId?: string | null;
    quantity: number;
    unitPrice: number;
    product: { id: string; name: string; imsCode: string };
    variation?: { id: string } | null;
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
  contactId?: string;
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
  expectedCloseDate?: string | null;
  contactId?: string | null;
  memberId?: string | null;
  companyId?: string | null;
  pipelineId?: string | null;
  assignedToId?: string | null;
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
  editReason?: string | null;
}

export async function getDeals(
  params: DealListParams = {},
): Promise<PaginatedDealsResponse> {
  const res = await api.get("/deals", { params });
  return res.data;
}

export async function getDealsKanban(pipelineId?: string): Promise<{
  pipeline: unknown;
  stages: Array<{ stage: string; deals: Deal[] }>;
  deals: Deal[];
}> {
  const res = await api.get("/deals/kanban", {
    params: pipelineId ? { pipelineId } : {},
  });
  return res.data;
}

export async function getDealById(id: string): Promise<{ deal: Deal }> {
  const res = await api.get(`/deals/${id}`);
  return res.data;
}

export async function createDeal(
  data: CreateDealData,
): Promise<{ deal: Deal }> {
  const res = await api.post("/deals", data);
  return res.data;
}

export async function updateDeal(
  id: string,
  data: UpdateDealData,
): Promise<{ deal: Deal }> {
  const res = await api.put(`/deals/${id}`, data);
  return res.data;
}

export async function updateDealStage(
  id: string,
  stage: string,
): Promise<{ deal: Deal }> {
  const res = await api.patch(`/deals/${id}/stage`, { stage });
  return res.data;
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`/deals/${id}`);
}

export interface AddDealLineItemData {
  productId: string;
  variationId?: string | null;
  quantity?: number;
  unitPrice?: number;
}

export async function addDealLineItem(
  dealId: string,
  data: AddDealLineItemData,
): Promise<{
  item: Deal["lineItems"] extends (infer I)[] | undefined ? I : never;
}> {
  const res = await api.post(`/deals/${dealId}/line-items`, data);
  return res.data;
}

export async function removeDealLineItem(
  dealId: string,
  lineItemId: string,
): Promise<void> {
  await api.delete(`/deals/${dealId}/line-items/${lineItemId}`);
}

export async function convertDealToSale(
  dealId: string,
  locationId: string,
): Promise<{ sale: { id: string; saleCode: string; total: number } }> {
  const res = await api.post(`/deals/${dealId}/convert-to-sale`, {
    locationId,
  });
  return res.data;
}
