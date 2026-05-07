/**
 * Review-workflow service — Phase 6.
 *
 * Manages the `reviewStatus` field on BlogPost / TenantPage:
 *   DRAFT → IN_REVIEW   (any author with UPDATE perm)
 *   IN_REVIEW → APPROVED (admin / superAdmin only — controller enforces)
 *   IN_REVIEW → DRAFT    (admin / superAdmin only — "reject")
 *   APPROVED → PUBLISHED (mirrored when the tenant clicks Publish; the
 *                         flip is done by blog/pages publish flows once
 *                         they observe an APPROVED record)
 *
 * The publish flow itself doesn't gate on `reviewStatus` (legacy single-
 * author tenants keep working). When CMS_REVIEW_WORKFLOW is on the
 * client UI nudges admins to publish only APPROVED records — the API is
 * permissive so feature-flag flips don't strand records mid-flow.
 *
 * Each transition writes an AuditLog row so the history is auditable.
 */

import { ContentReviewStatus, Prisma } from "@prisma/client";
import prisma from "@/config/prisma";
import { createError } from "@/middlewares/errorHandler";
import auditRepository from "@/modules/audit/audit.repository";

export type ContentRecordType = "BLOG_POST" | "TENANT_PAGE";

interface RecordRow {
  id: string;
  reviewStatus: ContentReviewStatus;
}

async function loadRecord(
  tenantId: string,
  recordType: ContentRecordType,
  recordId: string,
): Promise<RecordRow | null> {
  if (recordType === "BLOG_POST") {
    return prisma.blogPost.findFirst({
      where: { id: recordId, tenantId },
      select: { id: true, reviewStatus: true },
    });
  }
  return prisma.tenantPage.findFirst({
    where: { id: recordId, tenantId },
    select: { id: true, reviewStatus: true },
  });
}

async function writeStatus(
  recordType: ContentRecordType,
  id: string,
  status: ContentReviewStatus,
): Promise<RecordRow> {
  if (recordType === "BLOG_POST") {
    return prisma.blogPost.update({
      where: { id },
      data: { reviewStatus: status } as Prisma.BlogPostUpdateInput,
      select: { id: true, reviewStatus: true },
    });
  }
  return prisma.tenantPage.update({
    where: { id },
    data: { reviewStatus: status } as Prisma.TenantPageUpdateInput,
    select: { id: true, reviewStatus: true },
  });
}

async function audit(
  tenantId: string,
  userId: string,
  action: string,
  recordType: ContentRecordType,
  recordId: string,
  from: ContentReviewStatus,
  to: ContentReviewStatus,
): Promise<void> {
  try {
    await auditRepository.create({
      tenantId,
      userId,
      action,
      resource: recordType,
      resourceId: recordId,
      details: { from, to },
    });
  } catch {
    // audit failure is non-fatal
  }
}

export const reviewWorkflowService = {
  /**
   * Author-side: flip from DRAFT to IN_REVIEW. Idempotent — already-
   * in-review or APPROVED records are returned unchanged.
   */
  async requestReview(args: {
    tenantId: string;
    userId: string;
    recordType: ContentRecordType;
    recordId: string;
  }): Promise<RecordRow> {
    const record = await loadRecord(
      args.tenantId,
      args.recordType,
      args.recordId,
    );
    if (!record) throw createError("Record not found", 404);
    if (record.reviewStatus !== ContentReviewStatus.DRAFT) {
      // Idempotent for already-in-review; reject for APPROVED/PUBLISHED
      // (going backwards needs an explicit reject).
      if (record.reviewStatus === ContentReviewStatus.IN_REVIEW) {
        return record;
      }
      throw createError(
        `Cannot request review from ${record.reviewStatus}; reject first.`,
        409,
      );
    }
    const next = await writeStatus(
      args.recordType,
      record.id,
      ContentReviewStatus.IN_REVIEW,
    );
    await audit(
      args.tenantId,
      args.userId,
      "CONTENT_REVIEW_REQUEST",
      args.recordType,
      record.id,
      record.reviewStatus,
      ContentReviewStatus.IN_REVIEW,
    );
    return next;
  },

  /**
   * Admin-only: approve a record currently IN_REVIEW. The publish step
   * is separate (the existing publish flow flips PUBLISHED when the
   * tenant clicks Publish).
   */
  async approve(args: {
    tenantId: string;
    userId: string;
    recordType: ContentRecordType;
    recordId: string;
  }): Promise<RecordRow> {
    const record = await loadRecord(
      args.tenantId,
      args.recordType,
      args.recordId,
    );
    if (!record) throw createError("Record not found", 404);
    if (record.reviewStatus !== ContentReviewStatus.IN_REVIEW) {
      throw createError(
        `Cannot approve from ${record.reviewStatus}; record must be IN_REVIEW.`,
        409,
      );
    }
    const next = await writeStatus(
      args.recordType,
      record.id,
      ContentReviewStatus.APPROVED,
    );
    await audit(
      args.tenantId,
      args.userId,
      "CONTENT_REVIEW_APPROVE",
      args.recordType,
      record.id,
      record.reviewStatus,
      ContentReviewStatus.APPROVED,
    );
    return next;
  },

  /**
   * Admin-only: reject — moves an IN_REVIEW or APPROVED record back to
   * DRAFT so the author can iterate. The audit log records the
   * direction so the history is auditable.
   */
  async reject(args: {
    tenantId: string;
    userId: string;
    recordType: ContentRecordType;
    recordId: string;
  }): Promise<RecordRow> {
    const record = await loadRecord(
      args.tenantId,
      args.recordType,
      args.recordId,
    );
    if (!record) throw createError("Record not found", 404);
    if (record.reviewStatus === ContentReviewStatus.DRAFT) {
      return record; // already at DRAFT — idempotent
    }
    const next = await writeStatus(
      args.recordType,
      record.id,
      ContentReviewStatus.DRAFT,
    );
    await audit(
      args.tenantId,
      args.userId,
      "CONTENT_REVIEW_REJECT",
      args.recordType,
      record.id,
      record.reviewStatus,
      ContentReviewStatus.DRAFT,
    );
    return next;
  },
};

// Re-export the enum for the controller layer.
export { ContentReviewStatus };
