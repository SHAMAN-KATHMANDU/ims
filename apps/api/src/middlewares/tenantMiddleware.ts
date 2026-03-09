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
import { sendControllerError } from "@/utils/controllerError";

/**
 * Resolve tenant from JWT and set up tenant context.
 */
const resolveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        message: "No tenant associated with this user",
        error: "tenant_required",
      });
    }

    // Fetch the full tenant object (use basePrisma to avoid scoping issues)
    const tenant = await basePrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(403).json({
        message: "Tenant not found",
        error: "tenant_not_found",
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        message: "Your organization has been deactivated. Contact support.",
        error: "tenant_inactive",
      });
    }

    // Attach tenant to request
    req.tenant = tenant;

    // Run the rest of the middleware chain within tenant context
    // This enables Prisma auto-scoping for all downstream queries
    return runWithTenant(tenantId, () => next());
  } catch (error: unknown) {
    return sendControllerError(req, res, error, "Tenant resolution error");
  }
};

export default resolveTenant;
