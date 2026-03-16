import type { PaginationMeta } from "@/lib/apiTypes";

export interface TrashItem {
  entityType: string;
  id: string;
  name: string;
  deletedAt: string;
  deletedBy: string | null;
  deleteReason: string | null;
  tenantId: string;
  tenantName: string;
}

export interface TrashListParams {
  page?: number;
  limit?: number;
  entityType?: string;
  tenantId?: string;
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

export interface TrashListResponse {
  data: TrashItem[];
  pagination: PaginationMeta;
}
