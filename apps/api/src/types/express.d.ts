import { JwtPayload } from "jsonwebtoken";
import { Tenant } from "@prisma/client";

interface UserPayload extends JwtPayload {
  id: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Locals {
      validated?: {
        query?: unknown;
      };
    }

    interface Request {
      user?: UserPayload;
      /** Resolved tenant object (set by tenant middleware) */
      tenant?: Tenant;
      /** Auth context (set by requireAuth middleware after verifyToken + resolveTenant) */
      authContext?: import("@/shared/types").AuthContext;
    }
  }
}
