/**
 * Resource locator helpers for the `requirePermission` middleware.
 *
 * Every protected route passes a locator function to `requirePermission` that
 * resolves the request into a `Resource.id` — the primary key of the row in
 * the `resources` table. That id is what the permission engine walks to
 * resolve overwrites (role + user) along the ancestor chain.
 *
 * Locator contract:
 *   (req) => Promise<string> | string   // → Resource.id
 *
 * This module exposes two locator factories + the underlying resolver:
 *   - `paramLocator(type, paramName)` — scope-by-path (e.g., /products/:id)
 *   - `workspaceLocator()`            — collection routes (list / create)
 *   - `resolveResourceId(tenantId, type, externalId)` — pure resolver
 *
 * When an entity's Resource row is missing (e.g., row created before the
 * resource auto-create hook existed), we fall back to the tenant's
 * WORKSPACE Resource so the permission check remains meaningful.
 */

import type { Request } from "express";
import prisma from "@/config/prisma";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import type { ResourceType } from "./module-map";

/**
 * Resolve a Resource row id for a (tenantId, type, externalId) tuple.
 * `externalId === null` maps to the tenant's WORKSPACE Resource (lazy-created).
 */
export async function resolveResourceId(
  tenantId: string,
  type: ResourceType,
  externalId: string | null,
): Promise<string> {
  if (externalId === null) {
    return resolveWorkspaceResourceId(tenantId);
  }
  // Schema exposes a composite unique on (tenantId, externalId). Type is
  // retained in the signature for forward compatibility but not part of the
  // unique key — entities in the same tenant can't collide on externalId.
  void type;
  const found = await prisma.resource.findUnique({
    where: {
      tenantId_externalId: { tenantId, externalId },
    },
    select: { id: true },
  });
  if (found) return found.id;
  // Fallback for legacy rows without a Resource — scope to workspace
  // so the permission engine still evaluates tenant-level overwrites.
  return resolveWorkspaceResourceId(tenantId);
}

/**
 * Idempotently return the WORKSPACE Resource id for a tenant, creating it
 * if absent. Mirrors the auto-create hook's workspace bootstrap so routes
 * that fire before any entity-level Resource exists still resolve.
 */
export async function resolveWorkspaceResourceId(
  tenantId: string,
): Promise<string> {
  // The seed script uses `externalId = tenantId` for WORKSPACE rows because
  // the schema's `(tenantId, externalId)` unique constraint requires a
  // non-null value. Match that convention so the lookup is a single unique
  // read, not a scan.
  const existing = await prisma.resource.findUnique({
    where: {
      tenantId_externalId: { tenantId, externalId: tenantId },
    },
    select: { id: true },
  });
  if (existing) return existing.id;
  try {
    const created = await prisma.resource.create({
      data: {
        tenantId,
        type: "WORKSPACE",
        externalId: tenantId,
        parentId: null,
        path: `/${tenantId}/`,
        depth: 0,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error: unknown) {
    // Concurrent first-request-after-fresh-seed: another request raced past
    // findUnique and inserted the WORKSPACE row. Re-read instead of failing.
    if ((error as { code?: string })?.code === "P2002") {
      const refetch = await prisma.resource.findUnique({
        where: {
          tenantId_externalId: { tenantId, externalId: tenantId },
        },
        select: { id: true },
      });
      if (refetch) return refetch.id;
    }
    throw error;
  }
}

/**
 * Locator factory for routes that target a specific entity via a path
 * parameter (e.g., /products/:id, /transfers/:id/approve).
 */
export function paramLocator(
  type: ResourceType,
  paramName: string = "id",
): (req: Request) => Promise<string> {
  return async (req: Request): Promise<string> => {
    const { tenantId } = getAuthContext(req);
    const externalId = req.params[paramName];
    return resolveResourceId(
      tenantId,
      type,
      externalId && externalId.length > 0 ? externalId : null,
    );
  };
}

/**
 * Locator factory for collection routes (list / create on index) — resolves
 * to the tenant's WORKSPACE Resource id.
 */
export function workspaceLocator(): (req: Request) => Promise<string> {
  return async (req: Request): Promise<string> => {
    const { tenantId } = getAuthContext(req);
    return resolveWorkspaceResourceId(tenantId);
  };
}
