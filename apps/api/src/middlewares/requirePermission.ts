/**
 * requirePermission middleware
 *
 * Enforces fine-grained permission checks on API routes.
 * Delegates to `permissionService.assert()` to verify the user has the required
 * permission for a specific resource. `assert()` throws AppError(403) when the
 * user's effective bitset (role base mask ∪ overwrites along the ancestor chain)
 * does not contain the requested bit.
 *
 * Phase 2 enforcement gate — opt-in via `process.env.RBAC_ENFORCE === "true"`.
 * Default is **off** during the Phase 2 rollout because the existing test
 * surface (integration, concurrency, factories) does not yet seed RbacRole +
 * UserRole rows. Production envs flip `RBAC_ENFORCE=true` once Phase 3 lands
 * the seed updates, at which point the middleware asserts against the real
 * bitset engine.
 *
 * Usage:
 *   router.put(
 *     "/products/:id",
 *     requirePermission("INVENTORY.PRODUCTS.UPDATE", paramLocator("PRODUCT")),
 *     asyncHandler(controller.updateProduct),
 *   );
 */

import { Request, Response, NextFunction } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { fail } from "@/shared/response";
import { permissionService } from "@/modules/permissions/permission.service";

/** Phase 2 enforcement is opt-in — defaults to off until Phase 3 seeds land. */
function isEnforcementEnabled(): boolean {
  return process.env.RBAC_ENFORCE === "true";
}

/**
 * Assert that the user has a specific permission on a resource.
 * Throws AppError(403) if permission denied.
 */
export async function assertPermission(
  tenantId: string,
  userId: string,
  permissionKey: string,
  resourceId: string,
): Promise<void> {
  if (!isEnforcementEnabled()) return;
  await permissionService.assert(tenantId, userId, resourceId, permissionKey);
}

/**
 * Assert that user is the owner of a resource OR has a specific permission.
 * Useful for owner-or-permission checks (e.g., users can edit their own profile
 * OR admins can edit any profile).
 */
export async function assertOwnerOrPermission(
  tenantId: string,
  userId: string,
  ownerId: string,
  permissionKey: string,
  resourceId: string,
): Promise<void> {
  if (userId === ownerId) {
    return;
  }
  await assertPermission(tenantId, userId, permissionKey, resourceId);
}

/**
 * Express middleware factory: require a specific permission on a resource.
 *
 * @param permissionKey - Permission catalog key (e.g., "PRODUCTS.MANAGE")
 * @param resourceLocator - Function that extracts the resourceId from the request
 *                          (returns Promise<string> | string)
 *
 * Example:
 *   router.patch(
 *     "/products/:id",
 *     requirePermission("PRODUCTS.MANAGE", (req) => req.params.id),
 *     asyncHandler(controller.updateProduct),
 *   );
 */
export function requirePermission(
  permissionKey: string,
  resourceLocator: (req: Request) => Promise<string> | string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip locator lookup entirely when enforcement is off — locators
      // hit the DB, and we don't want that cost during Phase 1 rollout.
      if (!isEnforcementEnabled()) {
        next();
        return;
      }
      const { userId, tenantId } = getAuthContext(req);
      const resourceId = await resourceLocator(req);
      await assertPermission(tenantId, userId, permissionKey, resourceId);
      next();
    } catch (error: any) {
      if (error.statusCode === 403) {
        return fail(res, "Forbidden", 403);
      }
      // Unexpected error — let the global error handler deal with it
      next(error);
    }
  };
}

/**
 * Express middleware factory: require owner OR a specific permission on a resource.
 *
 * @param ownerLocator - Function that extracts the owner userId from the request
 * @param permissionKey - Permission catalog key (e.g., "PRODUCTS.MANAGE")
 * @param resourceLocator - Function that extracts the resourceId from the request
 *
 * Example:
 *   router.patch(
 *     "/users/:id",
 *     requireOwnerOrPermission(
 *       (req) => req.params.id,
 *       "USERS.MANAGE",
 *       (req) => req.params.id,
 *     ),
 *     asyncHandler(controller.updateUser),
 *   );
 */
export function requireOwnerOrPermission(
  ownerLocator: (req: Request) => Promise<string> | string,
  permissionKey: string,
  resourceLocator: (req: Request) => Promise<string> | string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isEnforcementEnabled()) {
        next();
        return;
      }
      const { userId, tenantId } = getAuthContext(req);
      const ownerId = await ownerLocator(req);
      const resourceId = await resourceLocator(req);
      await assertOwnerOrPermission(
        tenantId,
        userId,
        ownerId,
        permissionKey,
        resourceId,
      );
      next();
    } catch (error: any) {
      if (error.statusCode === 403) {
        return fail(res, "Forbidden", 403);
      }
      next(error);
    }
  };
}
