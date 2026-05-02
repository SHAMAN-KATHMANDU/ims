/**
 * Public API Key Auth Middleware
 *
 * Validates a `Authorization: Bearer pk_live_<id>_<secret>` header against
 * the TenantApiKey table, loads the bound TenantDomain, attaches both to the
 * request, and runs the downstream chain inside the tenant AsyncLocalStorage
 * context (so Prisma queries are auto-scoped exactly as they are for
 * resolveTenantFromHostname).
 *
 * On success this middleware sets:
 *   req.tenant  — full Tenant object (so existing public-* controllers work
 *                 unchanged when re-mounted under /public/v1/*).
 *   req.appType — "API" (third-party API consumer, not the tenant website).
 *   req.apiKey  — the loaded TenantApiKey record (used by enforceOriginMatch
 *                 and rateLimitByApiKey).
 *
 * Failure modes ALL collapse to a single 401 response — never enumerate
 * "key not found" vs "wrong secret" vs "revoked" to clients.
 */

import { Request, Response, NextFunction } from "express";
import type {
  Tenant,
  TenantApiKey,
  TenantDomain,
  TenantDomainApp,
} from "@prisma/client";
import { basePrisma } from "@/config/prisma";
import { runWithTenant } from "@/config/tenantContext";
import { sendControllerError } from "@/utils/controllerError";
import defaultService, {
  PublicApiKeysService,
} from "@/modules/public-api-keys/public-api-keys.service";
import defaultRepo, {
  PublicApiKeysRepository,
} from "@/modules/public-api-keys/public-api-keys.repository";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Loaded TenantApiKey record + bound TenantDomain (set by publicApiKeyAuth). */
      apiKey?: TenantApiKey & { tenantDomain: TenantDomain };
    }
  }
}

const BEARER_PREFIX = "Bearer ";

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ success: false, message: "Invalid or missing API key" });
}

function extractBearer(req: Request): string | null {
  const raw = req.headers.authorization;
  if (typeof raw !== "string") return null;
  if (!raw.startsWith(BEARER_PREFIX)) return null;
  const token = raw.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

interface Options {
  /** Override for tests. */
  service?: PublicApiKeysService;
  /** Override for tests. */
  repo?: PublicApiKeysRepository;
  /** Override tenant lookup for tests. */
  loadTenant?: (tenantId: string) => Promise<Tenant | null>;
}

function defaultLoadTenant(tenantId: string): Promise<Tenant | null> {
  return basePrisma.tenant.findUnique({ where: { id: tenantId } });
}

export function publicApiKeyAuth(options: Options = {}) {
  const service = options.service ?? defaultService;
  const repo = options.repo ?? defaultRepo;
  const loadTenant = options.loadTenant ?? defaultLoadTenant;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractBearer(req);
      if (!token) return unauthorized(res);

      const record = await service.verifyKey(token);
      if (!record) return unauthorized(res);

      const tenant = await loadTenant(record.tenantId);
      if (!tenant || !tenant.isActive) return unauthorized(res);

      req.tenant = tenant;
      req.apiKey = record;
      req.appType = "API" as TenantDomainApp;

      // Fire-and-forget last-used update.
      repo.touchLastUsed(record.id);

      return runWithTenant(tenant.id, () => next());
    } catch (error) {
      return sendControllerError(req, res, error, "publicApiKeyAuth error");
    }
  };
}

export default publicApiKeyAuth;
