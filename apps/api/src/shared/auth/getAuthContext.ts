import { Request } from "express";
import type { AuthContext } from "@/shared/types";

/**
 * Get auth context from request. Must be called after verifyToken and resolveTenant middleware.
 * Returns null if user or tenant is not set.
 */
export function getAuthContext(req: Request): AuthContext | null {
  const user = req.user;
  const tenant = req.tenant;

  if (!user?.id) return null;

  const tenantId = tenant?.id ?? user.tenantId;
  if (!tenantId) return null;

  return {
    userId: user.id,
    tenantId,
    role: user.role ?? "user",
  };
}
