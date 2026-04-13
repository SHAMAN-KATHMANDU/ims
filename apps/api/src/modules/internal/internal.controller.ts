/**
 * Internal Controller — thin HTTP layer for /internal/* endpoints.
 *
 * Responses are intentionally minimal and boolean-ish so Caddy's `ask` hook
 * can decide by HTTP status alone (200 = allow, 403 = deny).
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import service from "./internal.service";
import {
  DomainAllowedQuerySchema,
  ResolveHostQuerySchema,
} from "./internal.schema";

function handleZodError(res: Response, error: unknown): Response | null {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ error: "invalid_query", message: error.errors[0]?.message });
  }
  return null;
}

class InternalController {
  /**
   * Caddy on_demand_tls `ask` hook. Called BEFORE ACME cert issuance.
   *
   * Response contract:
   *   - 200: issue cert
   *   - 403: refuse (Caddy will not retry within the `interval` window)
   *   - 400: malformed query
   *   - 401: auth failure (handled by requireInternalToken upstream)
   */
  domainAllowed = async (req: Request, res: Response) => {
    try {
      const { domain } = DomainAllowedQuerySchema.parse(req.query);
      const result = await service.isDomainAllowedForTls(domain);
      if (result.allowed === true) {
        return res.status(200).json({
          allowed: true,
          tenantId: result.tenantId,
          hostname: result.hostname,
        });
      }
      return res
        .status(403)
        .json({ allowed: false as const, reason: result.reason });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        sendControllerError(req, res, error, "Domain allowed check error")
      );
    }
  };

  /**
   * tenant-site renderer middleware hook. Resolves a Host header to a
   * tenant. Returns 200 + tenant context if the host is a published tenant
   * site, 404 otherwise.
   */
  resolveHost = async (req: Request, res: Response) => {
    try {
      const { host } = ResolveHostQuerySchema.parse(req.query);
      const result = await service.resolveHost(host);
      if (result.resolved === true) {
        return res.status(200).json({
          resolved: true,
          tenantId: result.tenantId,
          tenantSlug: result.tenantSlug,
          hostname: result.hostname,
          websiteEnabled: result.websiteEnabled,
          isPublished: result.isPublished,
        });
      }
      return res
        .status(404)
        .json({ resolved: false as const, reason: result.reason });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        sendControllerError(req, res, error, "Resolve host error")
      );
    }
  };
}

export default new InternalController();
