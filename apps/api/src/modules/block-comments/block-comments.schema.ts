/**
 * Block-comments schemas — Phase 6 inline review threads.
 */

import { z } from "zod";

export const RECORD_TYPES = ["BLOG_POST", "TENANT_PAGE"] as const;
export const RecordTypeSchema = z.enum(RECORD_TYPES);
export type CommentRecordType = (typeof RECORD_TYPES)[number];

const idField = z.string().trim().min(1).max(80);

export const CreateCommentSchema = z.object({
  recordType: RecordTypeSchema,
  recordId: idField,
  blockId: idField.optional().nullable(),
  body: z.string().trim().min(1, "Comment body required").max(2000),
  parentId: idField.optional().nullable(),
});

export const ListCommentsQuerySchema = z.object({
  recordType: RecordTypeSchema,
  recordId: idField,
  blockId: idField.optional(),
  /** When true, hide resolved threads. Defaults to false (show all). */
  hideResolved: z
    .union([z.boolean(), z.string().transform((v) => v === "true")])
    .optional()
    .default(false),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type ListCommentsQuery = z.infer<typeof ListCommentsQuerySchema>;
