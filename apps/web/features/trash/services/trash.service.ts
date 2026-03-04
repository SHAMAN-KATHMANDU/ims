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

    const query = searchParams.toString();
    const url = query ? `/trash?${query}` : "/trash";
    const { data } = await api.get<TrashListResponse>(url);
    return data;
  } catch (error) {
    handleApiError(error, "fetch trash items");
    throw error;
  }
}

export async function restoreTrashItem(
  entityType: string,
  id: string,
): Promise<void> {
  try {
    await api.post(`/trash/${entityType.toLowerCase()}/${id}/restore`);
  } catch (error) {
    handleApiError(error, `restore ${entityType}`);
    throw error;
  }
}

export async function permanentlyDeleteTrashItem(
  entityType: string,
  id: string,
): Promise<void> {
  try {
    await api.delete(`/trash/${entityType.toLowerCase()}/${id}`);
  } catch (error) {
    handleApiError(error, `permanently delete ${entityType}`);
    throw error;
  }
}
