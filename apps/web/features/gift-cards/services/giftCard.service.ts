/**
 * Gift Card Service
 *
 * Single source for gift-card API calls. All HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";
import type {
  CreateGiftCardData,
  GiftCard,
  GiftCardListParams,
  PaginatedGiftCardsResponse,
  UpdateGiftCardData,
} from "../types";

interface GiftCardsApiResponse {
  message: string;
  data: GiftCard[];
  pagination: PaginationMeta;
}

interface GiftCardResponse {
  message: string;
  giftCard: GiftCard;
}

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export async function getGiftCards(
  params: GiftCardListParams = {},
): Promise<PaginatedGiftCardsResponse> {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search, status } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) {
    queryParams.set("search", search.trim());
  }
  if (status) {
    queryParams.set("status", status);
  }

  try {
    const response = await api.get<GiftCardsApiResponse>(
      `/gift-cards?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch gift cards");
  }
}

export async function getGiftCardById(id: string): Promise<GiftCard> {
  if (!id?.trim()) {
    throw new Error("Gift card ID is required");
  }
  try {
    const response = await api.get<GiftCardResponse>(`/gift-cards/${id}`);
    return response.data.giftCard;
  } catch (error) {
    handleApiError(error, `fetch gift card "${id}"`);
  }
}

export async function createGiftCard(
  data: CreateGiftCardData,
): Promise<GiftCard> {
  try {
    const response = await api.post<GiftCardResponse>("/gift-cards", data);
    return response.data.giftCard;
  } catch (error) {
    handleApiError(error, "create gift card");
  }
}

export async function updateGiftCard(
  id: string,
  data: UpdateGiftCardData,
): Promise<GiftCard> {
  if (!id?.trim()) {
    throw new Error("Gift card ID is required");
  }
  try {
    const response = await api.patch<GiftCardResponse>(
      `/gift-cards/${id}`,
      data,
    );
    return response.data.giftCard;
  } catch (error) {
    handleApiError(error, `update gift card "${id}"`);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates a 16-char human-friendly code in 4-block hyphenated form
 * (ambiguous chars I/O/0/1 omitted to reduce typo confusion).
 */
export function generateGiftCardCode(): string {
  const blocks: string[] = [];
  for (let b = 0; b < 4; b += 1) {
    let chunk = "";
    const bytes =
      typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint8Array(4))
        : new Uint8Array(4).map(() => Math.floor(Math.random() * 256));
    for (let i = 0; i < 4; i += 1) {
      const byte = bytes[i] ?? 0;
      chunk += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    blocks.push(chunk);
  }
  return blocks.join("-");
}
