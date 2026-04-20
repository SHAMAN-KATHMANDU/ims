/**
 * Reviews Service
 *
 * Single source for admin review-moderation API calls. All review HTTP
 * requests must go through this file. Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

// ============================================
// Types
// ============================================

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Review {
  id: string;
  tenantId: string;
  productId: string;
  product: { id: string; name: string } | null;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string | null;
  authorEmail: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListParams {
  page?: number;
  limit?: number;
  productId?: string;
  status?: ReviewStatus;
}

export interface PaginatedReviewsResponse {
  rows: Review[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateReviewData {
  status?: ReviewStatus;
}

interface ListReviewsApiResponse extends PaginatedReviewsResponse {
  message: string;
}

interface ReviewApiResponse {
  message: string;
  review: Review;
}

// ============================================
// API Functions
// ============================================

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export async function getReviews(
  params: ReviewListParams = {},
): Promise<PaginatedReviewsResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    productId,
    status,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (productId?.trim()) queryParams.set("productId", productId.trim());
  if (status) queryParams.set("status", status);

  try {
    const response = await api.get<ListReviewsApiResponse>(
      `/reviews?${queryParams.toString()}`,
    );
    return {
      rows: response.data.rows ?? [],
      total: response.data.total ?? 0,
      page: response.data.page ?? page,
      limit: response.data.limit ?? limit,
    };
  } catch (error) {
    handleApiError(error, "fetch reviews");
  }
}

export async function updateReview(
  id: string,
  data: UpdateReviewData,
): Promise<Review> {
  if (!id?.trim()) throw new Error("Review ID is required");
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }
  try {
    const response = await api.patch<ReviewApiResponse>(`/reviews/${id}`, data);
    return response.data.review;
  } catch (error) {
    handleApiError(error, `update review "${id}"`);
  }
}

export async function deleteReview(id: string): Promise<void> {
  if (!id?.trim()) throw new Error("Review ID is required");
  try {
    await api.delete(`/reviews/${id}`);
  } catch (error) {
    handleApiError(error, `delete review "${id}"`);
  }
}
