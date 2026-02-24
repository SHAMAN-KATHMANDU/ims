import { Request, Response, NextFunction } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { fail } from "@/shared/response";

/**
 * Middleware that attaches req.authContext from user and tenant.
 * Must run after verifyToken and resolveTenant.
 * Returns 401 if user or tenant context is missing.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authContext = getAuthContext(req);

  if (!authContext) {
    fail(res, "Not authenticated", 401);
    return;
  }

  req.authContext = authContext;
  next();
}
