import { Request } from "express";

interface RequestUser {
  id?: string;
  tenantId?: string;
  role?: string;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  role?: string;
}

/**
 * Safely extracts auth context from request user payload.
 * Throws 401 when middleware auth context is missing.
 */
export function getAuthContext(req: Request): AuthContext {
  const user = req.user as RequestUser | undefined;
  if (!user?.id || !user?.tenantId) {
    const authError = new Error("Unauthorized") as Error & {
      statusCode: number;
    };
    authError.statusCode = 401;
    throw authError;
  }
  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  };
}
