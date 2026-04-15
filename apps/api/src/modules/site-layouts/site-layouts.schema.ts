/**
 * site-layouts request/response schemas.
 *
 * The block tree validation lives in @repo/shared — we import BlockTreeSchema
 * so the API and the tenant-site renderer agree on the wire format.
 */

import { z } from "zod";
import { BlockTreeSchema, SITE_LAYOUT_SCOPES } from "@repo/shared";

export const SiteLayoutScopeEnum = z.enum(SITE_LAYOUT_SCOPES);

const scopeField = SiteLayoutScopeEnum;
const pageIdField = z.string().uuid().optional().nullable();

/**
 * Upsert payload: client sends the scope/pageId key + a block tree. The
 * server figures out whether this is a create or an update based on the
 * unique (tenant, scope, pageId) constraint.
 *
 * `blocks` is the draft body. Callers must explicitly POST /publish to
 * promote draft → published — mirrors the blog/tenant-pages draft workflow
 * so we can keep one mental model across the admin.
 */
export const UpsertSiteLayoutSchema = z
  .object({
    scope: scopeField,
    pageId: pageIdField,
    blocks: BlockTreeSchema,
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.scope === "page" && !val.pageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pageId"],
        message: "pageId is required when scope is 'page'",
      });
    }
    if (val.scope !== "page" && val.pageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pageId"],
        message: "pageId is only allowed when scope is 'page'",
      });
    }
  });

export const ListSiteLayoutsQuerySchema = z
  .object({
    scope: scopeField.optional(),
  })
  .strict();

export type UpsertSiteLayoutInput = z.infer<typeof UpsertSiteLayoutSchema>;
export type ListSiteLayoutsQuery = z.infer<typeof ListSiteLayoutsQuerySchema>;
