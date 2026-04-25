/**
 * Internal Controller — thin HTTP layer for /internal/* endpoints.
 *
 * Responses are intentionally minimal and boolean-ish so Caddy's `ask` hook
 * can decide by HTTP status alone (200 = allow, 403 = deny).
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { basePrisma } from "@/config/prisma";
import service from "./internal.service";
import {
  DomainAllowedQuerySchema,
  ResolveHostQuerySchema,
} from "./internal.schema";

/**
 * Publicly readable fields for the business profile DTO.
 * Tax / regulatory fields are excluded (PAN, VAT, taxId, registrationNumber).
 */
type PublicBusinessProfileDto = {
  id: string;
  tenantId: string;
  legalName: string | null;
  displayName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  websiteUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  mapUrl: string | null;
  defaultCurrency: string;
  timezone: string | null;
  socials: unknown;
  createdAt: Date;
  updatedAt: Date;
};

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
   * Public endpoint — no auth required.
   * Returns the business profile for a tenant (by slug) with sensitive
   * tax fields removed (PAN, VAT, taxId, registrationNumber).
   */
  getPublicBusinessProfile = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params as { slug: string };
      const tenant = await basePrisma.tenant.findUnique({
        where: { slug },
        include: { businessProfile: true },
      });
      if (!tenant) {
        return res
          .status(404)
          .json({ error: "not_found", message: "Tenant not found" });
      }
      const raw = tenant.businessProfile;
      let profile: PublicBusinessProfileDto | null = null;
      if (raw) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
          panNumber: _pan,
          vatNumber: _vat,
          taxId: _taxId,
          registrationNumber: _reg,
          ...safeFields
        } = raw;
        profile = safeFields;
      }
      return res.status(200).json({ profile });
    } catch (error) {
      return sendControllerError(req, res, error, "getPublicBusinessProfile");
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
