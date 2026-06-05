/**
 * Shared reference validator.
 *
 * Create/update flows across the app accept references to other records —
 * either by UUID foreign key (companyId, memberId, pipelineId, …) or by the
 * NAME of a tenant-scoped lookup (source, journey type, category, vendor, …).
 * Historically these were passed straight to Prisma with no application-level
 * check, so callers (notably the MCP/AI tools) could invent values that don't
 * exist, store junk, or silently create orphaned links.
 *
 * This module centralizes the "does this reference exist for this tenant?"
 * question so the website, REST API, and MCP tools all enforce the same rules:
 *
 *   - `assertEntityExists`  — UUID FK references. Throws if the row is missing
 *                             (or soft-deleted) for the tenant.
 *   - `resolveNamedLookup`  — name-based lookups unique on (tenantId, name).
 *                             Returns the canonical {id, name}. If missing it
 *                             REJECTS with a structured error carrying the list
 *                             of valid options — it never auto-creates. Callers
 *                             (the AI) must confirm with the user and create the
 *                             lookup explicitly, then retry.
 *   - `resolvePipelineStage`— validates a stage name against a pipeline's stages.
 *
 * Tenant note: the CRM models (Contact, Deal, Task, Lead, Activity, Company,
 * Pipeline) and the CRM lookups (CrmSource, CrmJourneyType, *Tag) are NOT in
 * the Prisma auto-tenant-scoping set (see config/prisma.ts), so every query
 * here passes `tenantId` explicitly. Trashable models still get `deletedAt:
 * null` auto-injected, so soft-deleted rows are excluded.
 */

import prisma from "@/config/prisma";
import { createError, type AppError } from "@/middlewares/errorHandler";

export interface ReferenceOption {
  id: string;
  name: string;
}

/** An AppError enriched with the valid options the AI/user can pick from. */
export interface ReferenceError extends AppError {
  referenceKind?: string;
  availableOptions?: ReferenceOption[];
}

function makeReferenceError(
  message: string,
  kind: string,
  statusCode: number,
  options?: ReferenceOption[],
): ReferenceError {
  const err = createError(
    message,
    statusCode,
    "REFERENCE_INVALID",
  ) as ReferenceError;
  err.referenceKind = kind;
  if (options) err.availableOptions = options;
  return err;
}

// ── Named lookups (resolve a user-supplied NAME → canonical {id, name}) ──────

export type NamedLookupKind =
  | "crm_source"
  | "crm_journey_type"
  | "contact_tag"
  | "product_tag"
  | "category"
  | "vendor"
  | "location"
  | "discount_type";

interface NamedLookupStrategy {
  /** Human label used in error messages. */
  label: string;
  /** MCP tool the AI should call (after user confirmation) to create one. */
  createTool: string;
  /** Find a row by case-insensitive name within the tenant. */
  findByName(tenantId: string, name: string): Promise<ReferenceOption | null>;
  /** List all options for the tenant (for the rejection error + list tools). */
  list(tenantId: string): Promise<ReferenceOption[]>;
}

type NameDelegate = {
  findFirst: (args: unknown) => Promise<ReferenceOption | null>;
  findMany: (args: unknown) => Promise<ReferenceOption[]>;
};

/**
 * Generic strategy for a `{ id, name }` model that is unique on (tenantId, name).
 * `delegate` is the Prisma model delegate (e.g. prisma.crmSource).
 */
function namedLookup(
  label: string,
  createTool: string,
  delegate: NameDelegate,
): NamedLookupStrategy {
  return {
    label,
    createTool,
    findByName: (tenantId, name) =>
      delegate.findFirst({
        where: { tenantId, name: { equals: name.trim(), mode: "insensitive" } },
        select: { id: true, name: true },
      }),
    list: (tenantId) =>
      delegate.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
  };
}

const NAMED_LOOKUPS: Record<NamedLookupKind, NamedLookupStrategy> = {
  crm_source: namedLookup(
    "source",
    "create_crm_source",
    prisma.crmSource as unknown as NameDelegate,
  ),
  crm_journey_type: namedLookup(
    "journey type",
    "create_crm_journey_type",
    prisma.crmJourneyType as unknown as NameDelegate,
  ),
  contact_tag: namedLookup(
    "contact tag",
    "create_contact_tag",
    prisma.contactTag as unknown as NameDelegate,
  ),
  product_tag: namedLookup(
    "product tag",
    "create_product_tag",
    prisma.productTag as unknown as NameDelegate,
  ),
  category: namedLookup(
    "category",
    "create_category",
    prisma.category as unknown as NameDelegate,
  ),
  vendor: namedLookup(
    "vendor",
    "create_vendor",
    prisma.vendor as unknown as NameDelegate,
  ),
  location: namedLookup(
    "location",
    "create_location",
    prisma.location as unknown as NameDelegate,
  ),
  discount_type: namedLookup(
    "discount type",
    "create_discount_type",
    prisma.discountType as unknown as NameDelegate,
  ),
};

export interface ResolveNamedLookupArgs {
  tenantId: string;
  kind: NamedLookupKind;
  value: string;
}

/**
 * Resolve a user-supplied name to a canonical lookup row.
 * Throws a {@link ReferenceError} (with `availableOptions`) when the value is
 * not an existing option. Never auto-creates.
 */
export async function resolveNamedLookup({
  tenantId,
  kind,
  value,
}: ResolveNamedLookupArgs): Promise<ReferenceOption> {
  const strategy = NAMED_LOOKUPS[kind];
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    throw makeReferenceError(
      `A ${strategy.label} name is required.`,
      kind,
      400,
    );
  }
  const found = await strategy.findByName(tenantId, trimmed);
  if (found) return found;

  const options = await strategy.list(tenantId);
  throw makeReferenceError(
    `Unknown ${strategy.label} "${trimmed}". It is not in this tenant's ${strategy.label} list. ` +
      `Pick one of the existing options, or confirm with the user and call ${strategy.createTool} to add it, then retry.`,
    kind,
    400,
    options,
  );
}

/** List the options for a named lookup (used by list_* tools and callers). */
export function listNamedLookup(
  tenantId: string,
  kind: NamedLookupKind,
): Promise<ReferenceOption[]> {
  return NAMED_LOOKUPS[kind].list(tenantId);
}

// ── Entity existence (validate a UUID foreign key for the tenant) ────────────

export type EntityKind =
  | "company"
  | "member"
  | "user"
  | "contact"
  | "deal"
  | "task"
  | "lead"
  | "activity"
  | "product"
  | "pipeline"
  | "category"
  | "vendor"
  | "location"
  | "contact_tag"
  | "product_tag";

interface EntityStrategy {
  label: string;
  exists(tenantId: string, id: string): Promise<boolean>;
}

type ExistsDelegate = {
  findFirst: (args: unknown) => Promise<{ id: string } | null>;
};

function entity(label: string, delegate: ExistsDelegate): EntityStrategy {
  return {
    label,
    exists: async (tenantId, id) => {
      const row = await delegate.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });
      return !!row;
    },
  };
}

const ENTITIES: Record<EntityKind, EntityStrategy> = {
  company: entity("company", prisma.company as unknown as ExistsDelegate),
  member: entity("member", prisma.member as unknown as ExistsDelegate),
  user: entity("user", prisma.user as unknown as ExistsDelegate),
  contact: entity("contact", prisma.contact as unknown as ExistsDelegate),
  deal: entity("deal", prisma.deal as unknown as ExistsDelegate),
  task: entity("task", prisma.task as unknown as ExistsDelegate),
  lead: entity("lead", prisma.lead as unknown as ExistsDelegate),
  activity: entity("activity", prisma.activity as unknown as ExistsDelegate),
  product: entity("product", prisma.product as unknown as ExistsDelegate),
  pipeline: entity("pipeline", prisma.pipeline as unknown as ExistsDelegate),
  category: entity("category", prisma.category as unknown as ExistsDelegate),
  vendor: entity("vendor", prisma.vendor as unknown as ExistsDelegate),
  location: entity("location", prisma.location as unknown as ExistsDelegate),
  contact_tag: entity(
    "contact tag",
    prisma.contactTag as unknown as ExistsDelegate,
  ),
  product_tag: entity(
    "product tag",
    prisma.productTag as unknown as ExistsDelegate,
  ),
};

export interface AssertEntityExistsArgs {
  tenantId: string;
  kind: EntityKind;
  /** Single id or array of ids. null/undefined entries are skipped. */
  id: string | string[] | null | undefined;
  /** Field name for a clearer error message, e.g. "companyId". */
  fieldName?: string;
}

/**
 * Assert that the referenced row(s) exist for the tenant (and are not
 * soft-deleted). No-op when `id` is null/undefined/empty. Throws a
 * {@link ReferenceError} naming the first missing id.
 */
export async function assertEntityExists({
  tenantId,
  kind,
  id,
  fieldName,
}: AssertEntityExistsArgs): Promise<void> {
  const strategy = ENTITIES[kind];
  const ids = (Array.isArray(id) ? id : [id]).filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  if (ids.length === 0) return;

  const unique = [...new Set(ids)];
  const results = await Promise.all(
    unique.map(async (one) => ({
      one,
      ok: await strategy.exists(tenantId, one),
    })),
  );
  const missing = results.filter((r) => !r.ok).map((r) => r.one);
  if (missing.length > 0) {
    const field = fieldName ? ` (${fieldName})` : "";
    throw makeReferenceError(
      `Referenced ${strategy.label}${field} not found for this tenant: ${missing.join(", ")}. ` +
        `Use the matching list_/get_ tool to find a valid id.`,
      kind,
      400,
    );
  }
}

// ── Pipeline stage resolution ────────────────────────────────────────────────

interface PipelineStageShape {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Validate a stage NAME against a pipeline's `stages` JSON. Returns the
 * canonical stage name (matched case-insensitively). Throws with the list of
 * valid stage names when the stage is unknown or the pipeline is missing.
 */
export async function resolvePipelineStage({
  tenantId,
  pipelineId,
  stageName,
}: {
  tenantId: string;
  pipelineId: string;
  stageName: string;
}): Promise<string> {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, tenantId },
    select: { id: true, name: true, stages: true },
  });
  if (!pipeline) {
    throw makeReferenceError(
      `Pipeline not found for this tenant: ${pipelineId}. Use list_pipelines to find a valid id.`,
      "pipeline",
      400,
    );
  }

  const stages = (
    Array.isArray(pipeline.stages) ? pipeline.stages : []
  ) as PipelineStageShape[];
  const stageNames = stages
    .map((s) => (typeof s === "string" ? s : s?.name))
    .filter((n): n is string => typeof n === "string" && n.trim() !== "");

  const target = (stageName ?? "").trim();
  const match = stageNames.find(
    (n) => n.toLowerCase() === target.toLowerCase(),
  );
  if (match) return match;

  throw makeReferenceError(
    `Unknown stage "${target}" for pipeline "${pipeline.name}". Valid stages: ${stageNames.join(", ") || "(none)"}.`,
    "pipeline_stage",
    400,
    stageNames.map((n) => ({ id: n, name: n })),
  );
}
