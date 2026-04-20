/**
 * Gift cards feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export type GiftCardStatus = "ACTIVE" | "REDEEMED" | "EXPIRED" | "VOIDED";

export interface GiftCard {
  id: string;
  tenantId: string;
  code: string;
  amount: number;
  balance: number;
  status: GiftCardStatus;
  purchaserId: string | null;
  recipientEmail: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: GiftCardStatus;
}

export interface PaginatedGiftCardsResponse {
  data: GiftCard[];
  pagination: PaginationMeta;
}

export interface CreateGiftCardData {
  code: string;
  amount: number;
  purchaserId?: string | null;
  recipientEmail?: string | null;
  expiresAt?: string | null;
  status?: GiftCardStatus;
}

export interface UpdateGiftCardData {
  recipientEmail?: string | null;
  expiresAt?: string | null;
  status?: GiftCardStatus;
  balance?: number;
}
