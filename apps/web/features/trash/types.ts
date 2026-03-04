import type { PaginationMeta } from "@/lib/apiTypes";

export interface TrashItem {
  entityType: string;
  id: string;
  name: string;
  deletedAt: string;
}

export interface TrashListParams {
  page?: number;
  limit?: number;
  entityType?: string;
}

export interface TrashListResponse {
  data: TrashItem[];
  pagination: PaginationMeta;
}
