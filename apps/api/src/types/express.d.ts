import { JwtPayload } from "jsonwebtoken";
import { Tenant, TenantDomainApp } from "@prisma/client";

interface UserPayload extends JwtPayload {
  id: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      /** Resolved tenant object (set by tenant middleware) */
      tenant?: Tenant;
      /** App type resolved from the request hostname (set by hostnameResolver) */
      appType?: TenantDomainApp;
    }
  }
}
