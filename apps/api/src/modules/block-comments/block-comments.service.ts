/**
 * Block-comments service — Phase 6 inline review threads.
 *
 * Comments are polymorphic over BLOG_POST / TENANT_PAGE. Each comment
 * may anchor to a specific blockId within the record body, or to the
 * record itself (`blockId = null`). Threading is one level deep — a
 * reply sets `parentId` to the root thread comment.
 *
 * Resolution is non-destructive: `resolvedAt` flags the thread as done
 * but keeps every row in place for audit. A reopen clears
 * `resolvedAt` / `resolvedBy`.
 */

import {
  BlockCommentRecordType,
  type BlockComment,
  type Prisma,
} from "@prisma/client";
import prisma from "@/config/prisma";
import { createError } from "@/middlewares/errorHandler";
import type {
  CommentRecordType,
  CreateCommentInput,
  ListCommentsQuery,
} from "./block-comments.schema";

export interface CommentRow {
  id: string;
  recordType: BlockCommentRecordType;
  recordId: string;
  blockId: string | null;
  body: string;
  authorId: string;
  parentId: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Confirm the parent BlogPost / TenantPage exists for this tenant.
 * Throws 404 when not — keeps cross-tenant comment writes impossible.
 */
async function assertParentExists(
  tenantId: string,
  recordType: CommentRecordType,
  recordId: string,
): Promise<void> {
  if (recordType === "BLOG_POST") {
    const exists = await prisma.blogPost.findFirst({
      where: { id: recordId, tenantId },
      select: { id: true },
    });
    if (!exists) throw createError("Record not found", 404);
    return;
  }
  const exists = await prisma.tenantPage.findFirst({
    where: { id: recordId, tenantId },
    select: { id: true },
  });
  if (!exists) throw createError("Record not found", 404);
}

export const blockCommentsService = {
  async list(
    tenantId: string,
    query: ListCommentsQuery,
  ): Promise<CommentRow[]> {
    const where: Prisma.BlockCommentWhereInput = {
      tenantId,
      recordType: query.recordType as BlockCommentRecordType,
      recordId: query.recordId,
      ...(query.blockId !== undefined ? { blockId: query.blockId } : {}),
      ...(query.hideResolved ? { resolvedAt: null } : {}),
    };
    const rows = await prisma.blockComment.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return rows;
  },

  async create(args: {
    tenantId: string;
    authorId: string;
    input: CreateCommentInput;
  }): Promise<CommentRow> {
    await assertParentExists(
      args.tenantId,
      args.input.recordType,
      args.input.recordId,
    );

    if (args.input.parentId) {
      const parent = await prisma.blockComment.findFirst({
        where: {
          id: args.input.parentId,
          tenantId: args.tenantId,
          recordType: args.input.recordType as BlockCommentRecordType,
          recordId: args.input.recordId,
        },
        select: { id: true },
      });
      if (!parent) {
        throw createError("Parent comment not found in this thread", 404);
      }
    }

    return prisma.blockComment.create({
      data: {
        tenantId: args.tenantId,
        recordType: args.input.recordType as BlockCommentRecordType,
        recordId: args.input.recordId,
        blockId: args.input.blockId ?? null,
        body: args.input.body,
        authorId: args.authorId,
        parentId: args.input.parentId ?? null,
      },
    });
  },

  async resolve(args: {
    tenantId: string;
    userId: string;
    id: string;
  }): Promise<CommentRow> {
    const existing = await prisma.blockComment.findFirst({
      where: { id: args.id, tenantId: args.tenantId },
      select: { id: true, resolvedAt: true },
    });
    if (!existing) throw createError("Comment not found", 404);
    if (existing.resolvedAt) return existing as unknown as CommentRow;
    return prisma.blockComment.update({
      where: { id: args.id },
      data: {
        resolvedAt: new Date(),
        resolvedBy: args.userId,
      },
    });
  },

  async reopen(args: {
    tenantId: string;
    userId: string;
    id: string;
  }): Promise<CommentRow> {
    const existing = await prisma.blockComment.findFirst({
      where: { id: args.id, tenantId: args.tenantId },
      select: { id: true, resolvedAt: true },
    });
    if (!existing) throw createError("Comment not found", 404);
    if (!existing.resolvedAt) return existing as unknown as CommentRow;
    return prisma.blockComment.update({
      where: { id: args.id },
      data: { resolvedAt: null, resolvedBy: null },
    });
  },

  async remove(args: {
    tenantId: string;
    userId: string;
    role?: string;
    id: string;
  }): Promise<void> {
    const existing = await prisma.blockComment.findFirst({
      where: { id: args.id, tenantId: args.tenantId },
      select: { id: true, authorId: true },
    });
    if (!existing) throw createError("Comment not found", 404);
    // Authors delete their own; admins can delete any.
    const isAdmin = args.role === "admin" || args.role === "superAdmin";
    if (existing.authorId !== args.userId && !isAdmin) {
      throw createError("Only the author or an admin can delete", 403);
    }
    // Cascade deletes replies via FK.
    await prisma.blockComment.delete({ where: { id: args.id } });
  },
};

export type { BlockComment };
