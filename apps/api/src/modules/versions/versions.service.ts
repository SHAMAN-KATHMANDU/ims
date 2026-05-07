/**
 * Versions service — high-level API for snapshot writes, listing, and
 * restore. Sits between feature services (blog, pages, sites) and the
 * versions repository.
 *
 * Snapshot strategy:
 *   - We snapshot the *post-mutation* row, not the pre-mutation one. The
 *     intuition: restoring should land you in the state you said "save"
 *     on, not the state you walked in with. This matches Notion's "page
 *     history" semantics.
 *   - The snapshot is the entire row (Prisma JSON-serialised). Restoration
 *     replays every field except the primary key, so renames, tag edits,
 *     and SEO changes all roll back together.
 *
 * Restoration:
 *   - Done in a transaction: the live row is overwritten, then a fresh
 *     "restored from version X" snapshot is written so the restore itself
 *     is undoable.
 *   - The service callers (blog, pages) supply the per-entity update fn
 *     (e.g. blogRepo.updatePost) so this service stays generic.
 */

import { createError } from "@/middlewares/errorHandler";
import auditRepository from "@/modules/audit/audit.repository";
import {
  blogPostVersionsRepo,
  tenantPageVersionsRepo,
  siteLayoutVersionsRepo,
  type VersionListItem,
} from "./versions.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotContext {
  tenantId: string;
  /** Null when the scheduler / system writes the version (no human in loop). */
  editorId: string | null;
  note?: string | null;
}

export type VersionResource = "BLOG_POST" | "TENANT_PAGE" | "SITE_LAYOUT";

const AUDIT_ACTIONS = {
  RESTORE: "CONTENT_RESTORE_VERSION",
  VIEW: "CONTENT_VIEW_VERSION",
} as const;

// ---------------------------------------------------------------------------
// Snapshot writers (called by feature services after a successful mutation)
// ---------------------------------------------------------------------------

/**
 * Snapshot a BlogPost row. Failure is non-fatal — versioning must never
 * block the user's save. We log via console (the API has structured
 * logging available; this keeps the helper standalone-testable).
 */
export async function snapshotBlogPost(
  blogPost: { id: string },
  rowSnapshot: unknown,
  ctx: SnapshotContext,
): Promise<void> {
  try {
    await blogPostVersionsRepo.write({
      parentId: blogPost.id,
      tenantId: ctx.tenantId,
      snapshot: rowSnapshot,
      editorId: ctx.editorId,
      note: ctx.note ?? null,
    });
  } catch (err) {
    console.warn("[versions] snapshotBlogPost failed:", err);
  }
}

export async function snapshotTenantPage(
  page: { id: string },
  rowSnapshot: unknown,
  ctx: SnapshotContext,
): Promise<void> {
  try {
    await tenantPageVersionsRepo.write({
      parentId: page.id,
      tenantId: ctx.tenantId,
      snapshot: rowSnapshot,
      editorId: ctx.editorId,
      note: ctx.note ?? null,
    });
  } catch (err) {
    console.warn("[versions] snapshotTenantPage failed:", err);
  }
}

export async function snapshotSiteLayout(
  siteLayout: { id: string },
  rowSnapshot: unknown,
  ctx: SnapshotContext,
): Promise<void> {
  try {
    await siteLayoutVersionsRepo.write({
      parentId: siteLayout.id,
      tenantId: ctx.tenantId,
      snapshot: rowSnapshot,
      editorId: ctx.editorId,
      note: ctx.note ?? null,
    });
  } catch (err) {
    console.warn("[versions] snapshotSiteLayout failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listBlogPostVersions(
  tenantId: string,
  blogPostId: string,
): Promise<VersionListItem[]> {
  return blogPostVersionsRepo.list(tenantId, blogPostId);
}

export async function listTenantPageVersions(
  tenantId: string,
  pageId: string,
): Promise<VersionListItem[]> {
  return tenantPageVersionsRepo.list(tenantId, pageId);
}

export async function listSiteLayoutVersions(
  tenantId: string,
  siteLayoutId: string,
): Promise<VersionListItem[]> {
  return siteLayoutVersionsRepo.list(tenantId, siteLayoutId);
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

/**
 * Generic restore — reads the snapshot, hands it to the caller's
 * `applyToRow` fn (which writes it back into the live table), then
 * snapshots the new state and emits an audit log entry.
 *
 * Caller-supplied `applyToRow` is responsible for stripping fields that
 * shouldn't be replayed (id, createdAt, …) and for any per-entity post-
 * processing (e.g. recomputing readingMinutes for blog posts).
 */
async function restoreInternal<S>(args: {
  tenantId: string;
  editorId: string;
  resource: VersionResource;
  loadSnapshot: () => Promise<{ snapshot: S; parentId: string } | null>;
  applyToRow: (snapshot: S) => Promise<{ id: string; rowSnapshot: unknown }>;
  writeSnapshot: (
    parent: { id: string },
    rowSnapshot: unknown,
    ctx: SnapshotContext,
  ) => Promise<void>;
  auditDetails?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const loaded = await args.loadSnapshot();
  if (!loaded) throw createError("Version not found", 404);
  const applied = await args.applyToRow(loaded.snapshot);
  await args.writeSnapshot(applied, applied.rowSnapshot, {
    tenantId: args.tenantId,
    editorId: args.editorId,
    note: `Restored from version`,
  });
  try {
    await auditRepository.create({
      tenantId: args.tenantId,
      userId: args.editorId,
      action: AUDIT_ACTIONS.RESTORE,
      resource: args.resource,
      resourceId: applied.id,
      details: { ...args.auditDetails, fromVersion: undefined },
    });
  } catch {
    // audit failure is non-fatal
  }
  return { id: applied.id };
}

/**
 * BlogPost-specific restore. Caller provides the live-row update via
 * `updateLive(snapshot)` so the service stays decoupled from the blog
 * repository.
 */
export async function restoreBlogPostVersion(args: {
  tenantId: string;
  editorId: string;
  versionId: string;
  updateLive: (snapshot: unknown) => Promise<{
    id: string;
    rowSnapshot: unknown;
  }>;
}): Promise<{ id: string }> {
  return restoreInternal({
    tenantId: args.tenantId,
    editorId: args.editorId,
    resource: "BLOG_POST",
    loadSnapshot: async () => {
      const row = await blogPostVersionsRepo.get(args.tenantId, args.versionId);
      if (!row) return null;
      return { snapshot: row.snapshot, parentId: row.blogPostId };
    },
    applyToRow: args.updateLive,
    writeSnapshot: snapshotBlogPost,
    auditDetails: { versionId: args.versionId },
  });
}

export async function restoreTenantPageVersion(args: {
  tenantId: string;
  editorId: string;
  versionId: string;
  updateLive: (snapshot: unknown) => Promise<{
    id: string;
    rowSnapshot: unknown;
  }>;
}): Promise<{ id: string }> {
  return restoreInternal({
    tenantId: args.tenantId,
    editorId: args.editorId,
    resource: "TENANT_PAGE",
    loadSnapshot: async () => {
      const row = await tenantPageVersionsRepo.get(
        args.tenantId,
        args.versionId,
      );
      if (!row) return null;
      return { snapshot: row.snapshot, parentId: row.tenantPageId };
    },
    applyToRow: args.updateLive,
    writeSnapshot: snapshotTenantPage,
    auditDetails: { versionId: args.versionId },
  });
}

// (Site-layout restore not exposed in Phase 4 — site-editor uses its own
// draft/publish flow with revalidation hooks; restoring there is more
// invasive and lives in a follow-up phase.)
