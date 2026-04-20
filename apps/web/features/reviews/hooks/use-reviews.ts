"use client";

/**
 * React Query wrappers for reviews. Business logic and API calls live in
 * reviewsService; hooks only wire query/mutation and cache keys.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getReviews,
  updateReview,
  deleteReview,
  type Review,
  type ReviewListParams,
  type UpdateReviewData,
  type PaginatedReviewsResponse,
  type ReviewStatus,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../services/reviews.service";

export type {
  Review,
  ReviewListParams,
  UpdateReviewData,
  PaginatedReviewsResponse,
  ReviewStatus,
};

export { DEFAULT_PAGE, DEFAULT_LIMIT };

// ============================================
// Query Keys
// ============================================

export const reviewKeys = {
  all: ["reviews"] as const,
  lists: () => [...reviewKeys.all, "list"] as const,
  list: (params: ReviewListParams) => [...reviewKeys.lists(), params] as const,
};

// ============================================
// Hooks
// ============================================

export function useReviewsPaginated(params: ReviewListParams = {}) {
  const normalizedParams: ReviewListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    productId: params.productId?.trim() || undefined,
    status: params.status,
  };

  return useQuery({
    queryKey: reviewKeys.list(normalizedParams),
    queryFn: () => getReviews(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReviewData }) =>
      updateReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}
