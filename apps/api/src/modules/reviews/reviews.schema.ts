/**
 * Zod schemas for the admin reviews API. Status values mirror the
 * ReviewStatus enum so moderation stays a closed set.
 */

import { z } from "zod";

export const ReviewStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const ListReviewsQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  status: ReviewStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const UpdateReviewSchema = z
  .object({
    status: ReviewStatusSchema.optional(),
  })
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "At least one field required",
  );

export type ListReviewsQuery = z.infer<typeof ListReviewsQuerySchema>;
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>;
