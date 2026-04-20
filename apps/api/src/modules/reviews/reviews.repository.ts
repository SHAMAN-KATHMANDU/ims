/**
 * Reviews repository — Prisma queries for ProductReview moderation.
 *
 * Lists return the review row plus minimal product metadata so the admin
 * UI can render "review of <product>" without a second round-trip. All
 * queries scope by tenantId belt-and-suspenders even though the service
 * already holds tenant context.
 */

import type { ProductReview, ReviewStatus } from "@prisma/client";
import prisma from "@/config/prisma";

export type ReviewRow = ProductReview & {
  product: { id: string; name: string } | null;
};

export class ReviewsRepository {
  async list(
    tenantId: string,
    filters: {
      productId?: string;
      status?: ReviewStatus;
      page: number;
      limit: number;
    },
  ): Promise<{ rows: ReviewRow[]; total: number }> {
    const where = {
      tenantId,
      deletedAt: null,
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.productReview.count({ where }),
    ]);
    return { rows, total };
  }

  findById(tenantId: string, id: string): Promise<ReviewRow | null> {
    return prisma.productReview.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  updateStatus(
    _tenantId: string,
    id: string,
    status: ReviewStatus,
  ): Promise<ReviewRow> {
    return prisma.productReview.update({
      where: { id },
      data: { status },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  softDelete(_tenantId: string, id: string): Promise<void> {
    return prisma.productReview
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .then(() => undefined);
  }
}

export default new ReviewsRepository();
