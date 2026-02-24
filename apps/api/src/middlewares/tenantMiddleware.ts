/**
 * Tenant Resolution Middleware
 *
 * Resolves the tenant from the authenticated user's JWT and attaches
 * the full tenant object to the request. Also sets up the AsyncLocalStorage
 * tenant context for Prisma auto-scoping.
 *
 * Must run AFTER verifyToken middleware.
 */

import { Request, Response, NextFunction } from "express";
import { basePrisma } from "@/config/prisma";
import { runWithTenant } from "@/config/tenantContext";
import { fail } from "@/shared/response";
import { getAuthContext } from "@/shared/auth/getAuthContext";

/**
 * Resolve tenant from JWT and set up tenant context.
 */
const resolveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const auth = getAuthContext(req);
    const tenantId = auth?.tenantId;

    if (!tenantId) {
      return fail(
        res,
        "No tenant associated with this user",
        403,
        "tenant_required",
      );
    }

    const tenant = await basePrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return fail(res, "Tenant not found", 403, "tenant_not_found");
    }

    if (!tenant.isActive) {
      return fail(
        res,
        "Your organization has been deactivated. Contact support.",
        403,
        "tenant_inactive",
      );
    }

    req.tenant = tenant;

    return runWithTenant(tenantId, () => next());
  } catch (error: unknown) {
    next(error);
  }
};

export default resolveTenant;
