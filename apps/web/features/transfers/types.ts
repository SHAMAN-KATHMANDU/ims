/**
 * Transfers feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";
import type { LocationType } from "@/features/locations";

export type TransferStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export interface TransferItem {
  id: string;
  transferId: string;
  variationId: string;
  quantity: number;
  variation: {
    id: string;
    product: {
      id: string;
      imsCode: string;
      name: string;
      category?: { id: string; name: string };
    };
    attributes?: Array<{
      attributeType: { name: string };
      attributeValue: { value: string };
    }>;
    photos?: Array<{
      id: string;
      photoUrl: string;
      isPrimary: boolean;
    }>;
  };
}

export interface Transfer {
  id: string;
  transferCode: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  createdAt: string;
  fromLocation?: { id: string; name: string; type: LocationType };
  toLocation?: { id: string; name: string; type: LocationType };
  items?: TransferItem[];
}

export interface TransferListParams {
  page?: number;
  limit?: number;
  status?: TransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedTransfersResponse {
  data: Transfer[];
  pagination: PaginationMeta;
}

export interface CreateTransferItem {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
}

export interface CreateTransferData {
  fromLocationId: string;
  toLocationId: string;
  items: CreateTransferItem[];
  notes?: string;
}
