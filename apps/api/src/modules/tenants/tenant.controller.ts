/**
 * Tenant Self Controller — thin HTTP layer for tenant-scoped self-service domain management.
 * Reads tenantId from the JWT via getAuthContext instead of a URL parameter so tenants
 * manage only their own resources.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import platformDomainsService from "@/modules/platform-domains/platform-domains.service";
import {
  CreateTenantDomainSchema,
  ListTenantDomainsQuerySchema,
  UpdateTenantDomainSchema,
} from "@/modules/platform-domains/platform-domains.schema";

function handleError(
  req: Request,
  res: Response,
  error: unknown,
  context: string,
) {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  const err = error as { statusCode?: number; message?: string };
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res
      .status(err.statusCode)
      .json({ message: err.message ?? "Request failed" });
  }
  return sendControllerError(req, res, error, context);
}

class TenantController {
  /**
   * GET /tenants/me/domains
   * List all domains for the calling tenant.
   */
  listMyDomains = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const parsed = ListTenantDomainsQuerySchema.safeParse(req.query);
      const appType = parsed.success ? parsed.data.appType : undefined;
      const domains = await platformDomainsService.listTenantDomains(
        tenantId,
        appType,
      );
      return res.status(200).json({ message: "OK", domains });
    } catch (error) {
      return handleError(req, res, error, "listMyDomains");
    }
  };

  /**
   * POST /tenants/me/domains
   * Add a domain to the calling tenant.
   */
  addMyDomain = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = CreateTenantDomainSchema.parse(req.body);
      const domain = await platformDomainsService.addDomain(tenantId, body);
      return res.status(201).json({ message: "Domain added", domain });
    } catch (error) {
      return handleError(req, res, error, "addMyDomain");
    }
  };

  /**
   * DELETE /tenants/me/domains/:domainId
   * Delete a domain that belongs to the calling tenant.
   */
  deleteMyDomain = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const domainId = req.params.domainId ?? "";
      // Verify ownership: domain must belong to this tenant.
      const domains = await platformDomainsService.listTenantDomains(tenantId);
      if (!domains.find((d) => d.id === domainId)) {
        return res.status(404).json({ message: "Domain not found" });
      }
      await platformDomainsService.deleteDomain(domainId);
      return res.status(200).json({ message: "Domain deleted" });
    } catch (error) {
      return handleError(req, res, error, "deleteMyDomain");
    }
  };

  /**
   * GET /tenants/me/domains/:domainId/verification
   * Get DNS verification instructions for a domain belonging to the calling tenant.
   */
  getMyDomainVerification = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const domainId = req.params.domainId ?? "";
      const domains = await platformDomainsService.listTenantDomains(tenantId);
      if (!domains.find((d) => d.id === domainId)) {
        return res.status(404).json({ message: "Domain not found" });
      }
      const instructions =
        await platformDomainsService.getVerificationInstructions(domainId);
      return res.status(200).json({ message: "OK", ...instructions });
    } catch (error) {
      return handleError(req, res, error, "getMyDomainVerification");
    }
  };

  /**
   * PATCH /tenants/me/domains/:domainId
   * Update a domain belonging to the calling tenant. Currently only
   * `isPrimary` is settable from this surface — `appType` changes still
   * require platform-admin (where domain re-routing is reviewed).
   */
  updateMyDomain = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const domainId = req.params.domainId ?? "";
      const body = UpdateTenantDomainSchema.parse(req.body);
      const domains = await platformDomainsService.listTenantDomains(tenantId);
      if (!domains.find((d) => d.id === domainId)) {
        return res.status(404).json({ message: "Domain not found" });
      }
      // Tenants can only flip the primary flag; appType stays platform-admin
      // territory to avoid surprise app-type swaps.
      const domain = await platformDomainsService.updateDomain(domainId, {
        isPrimary: body.isPrimary,
      });
      return res.status(200).json({ message: "Domain updated", domain });
    } catch (error) {
      return handleError(req, res, error, "updateMyDomain");
    }
  };

  /**
   * POST /tenants/me/domains/:domainId/verification
   * Run DNS TXT verification for a domain belonging to the calling tenant.
   */
  verifyMyDomain = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const domainId = req.params.domainId ?? "";
      const domains = await platformDomainsService.listTenantDomains(tenantId);
      if (!domains.find((d) => d.id === domainId)) {
        return res.status(404).json({ message: "Domain not found" });
      }
      const domain = await platformDomainsService.verifyDomain(domainId);
      return res.status(200).json({ message: "Domain verified", domain });
    } catch (error) {
      return handleError(req, res, error, "verifyMyDomain");
    }
  };
}

export default new TenantController();
