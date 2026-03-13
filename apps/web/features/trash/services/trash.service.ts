/**
 * Trash Service
 *
 * API calls for trash (soft-deleted items) list, restore, and permanent delete.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { TrashListParams, TrashListResponse } from "../types";

export async function getTrashItems(
  params?: TrashListParams,
): Promise<TrashListResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.entityType) searchParams.set("entityType", params.entityType);

    if (params?.tenantId) searchParams.set("tenantId", params.tenantId);

    const query = searchParams.toString();
    const url = query ? `/platform/trash?${query}` : "/platform/trash";
    const { data } = await api.get<TrashListResponse>(url);
    return data;
  } catch (error) {
    handleApiError(error, "fetch trash items");
  }
}

export async function restoreTrashItem(
  entityType: string,
  id: string,
): Promise<void> {
  try {
    await api.post(`/platform/trash/${entityType.toLowerCase()}/${id}/restore`);
  } catch (error) {
    handleApiError(error, `restore ${entityType}`);
  }
}

export async function permanentlyDeleteTrashItem(
  entityType: string,
  id: string,
): Promise<void> {
  try {
    await api.delete(`/platform/trash/${entityType.toLowerCase()}/${id}`);
  } catch (error) {
    handleApiError(error, `permanently delete ${entityType}`);
  }
}
