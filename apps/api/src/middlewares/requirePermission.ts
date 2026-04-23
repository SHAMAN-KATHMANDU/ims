/**
 * requirePermission middleware
 *
 * Enforces fine-grained permission checks on API routes.
 * Calls permissionService.assert() to verify user has required permission for a resource.
 *
 * In Phase 1, this is stubbed because rbac-core's permissionService is not yet complete.
 * Phase 2 will integrate the real service and remove role-based gates.
 *
 * Usage:
 *   router.patch(
 *     "/products/:id",
 *     requirePermission("PRODUCTS.MANAGE", req => req.params.id),
 *     asyncHandler(controller.updateProduct),
 *   );
 */

import { Request, Response, NextFunction } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { fail } from "@/shared/response";

/**
 * Assert that the user has a specific permission on a resource.
 * Throws AppError(403) if permission denied.
 *
 * NOTE: This is a stub. Phase 2 will call the real permissionService.assert().
 */
export async function assertPermission(
  tenantId: string,
  userId: string,
  permissionKey: string,
  resourceId: string,
): Promise<void> {
  // PHASE-1-STUB: Always allow for now.
  // Phase 2: Call permissionService.assert(tenantId, userId, permissionKey, resourceId)
  // which will throw AppError(403) if permission denied.
}

/**
 * Assert that user is the owner of a resource OR has a specific permission.
 * Useful for owner-or-permission checks (e.g., users can edit their own profile
 * OR admins can edit any profile).
 *
 * NOTE: This is a stub. Phase 2 will call the real permissionService.
 */
export async function assertOwnerOrPermission(
  tenantId: string,
  userId: string,
  ownerId: string,
  permissionKey: string,
  resourceId: string,
): Promise<void> {
  // PHASE-1-STUB: Allow if owner or always allow (permissionService stub).
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
