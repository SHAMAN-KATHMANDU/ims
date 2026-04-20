/**
 * Reviews service — admin moderation boundary for product reviews.
 *
 * Public submissions land in PENDING; admins transition to APPROVED or
 * REJECTED via PATCH, or soft-delete via DELETE. No status cascades — a
 * REJECTED review can be flipped back to APPROVED if moderation changes
 * its mind.
 */

import { createError } from "@/middlewares/errorHandler";
import defaultRepo, { type ReviewRow } from "./reviews.repository";
import type { ListReviewsQuery, UpdateReviewInput } from "./reviews.schema";

type Repo = typeof defaultRepo;

export class ReviewsService {
  constructor(private readonly repo: Repo = defaultRepo) {}

  list(
    tenantId: string,
    query: ListReviewsQuery,
  ): Promise<{
    rows: ReviewRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repo
      .list(tenantId, {
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.status ? { status: query.status } : {}),
        page: query.page,
        limit: query.limit,
      })
      .then(({ rows, total }) => ({
        rows,
        total,
        page: query.page,
        limit: query.limit,
      }));
  }

  async update(
    tenantId: string,
    id: string,
    patch: UpdateReviewInput,
  ): Promise<ReviewRow> {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw createError("Review not found", 404);
    if (patch.status === undefined) return existing;
    return this.repo.updateStatus(tenantId, id, patch.status);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw createError("Review not found", 404);
    await this.repo.softDelete(tenantId, id);
  }
}

export default new ReviewsService();
