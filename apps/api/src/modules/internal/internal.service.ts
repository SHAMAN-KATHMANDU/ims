/**
 * Internal service — the decision logic for /internal/domain-allowed and
 * /internal/resolve-host.
 *
 * Both endpoints share the same lookup pipeline but return different shapes:
 *   - domain-allowed: Caddy TLS issuance gate. Strict — unverified = deny.
 *     200 means Caddy proceeds with ACME cert issuance.
 *   - resolve-host: tenant-site renderer middleware gate. Slightly more lax
 *     than domain-allowed (we allow unpublished sites to resolve so the
 *     renderer can return a "coming soon" page instead of a hard 404).
 *
 * Decision: strict=true on the TLS gate (per §6 of the plan). Unverified
 * domains never get certs — browser shows TLS error, customer knows their
 * DNS isn't set up.
 */

import type { TenantDomainApp } from "@prisma/client";
import defaultRepo, { type DomainWithContext } from "./internal.repository";

type Repo = typeof defaultRepo;

export type DomainAllowedResult =
  | {
      allowed: true;
      tenantId: string;
      hostname: string;
      appType: TenantDomainApp;
    }
  | {
      allowed: false;
      reason:
        | "unknown_host"
        | "not_verified"
        | "tenant_inactive"
        | "website_disabled"
        | "ims_not_allowed_via_caddy";
    };

export type ResolveHostResult =
  | {
      resolved: true;
      tenantId: string;
      tenantSlug: string;
      hostname: string;
      appType: TenantDomainApp;
      websiteEnabled: boolean;
      isPublished: boolean;
      templateSlug: string | null;
    }
  | {
      resolved: false;
      reason:
        | "unknown_host"
        | "tenant_inactive"
        | "not_verified"
        | "website_disabled";
    };

export class InternalService {
  constructor(private readonly repo: Repo = defaultRepo) {}

  /**
   * Caddy ask hook: should we issue a cert for this domain?
   *
   * Strict policy:
   *  - Hostname must exist in tenant_domains.
   *  - Tenant must be active.
   *  - Domain must be verified (verifiedAt !== null).
   *  - appType must be WEBSITE — Caddy only serves the tenant-site renderer;
   *    IMS/API domains are terminated elsewhere (by the platform's own nginx
   *    or Caddy server blocks).
   *  - SiteConfig.websiteEnabled must be true.
   */
  async isDomainAllowedForTls(hostname: string): Promise<DomainAllowedResult> {
    const domain = await this.repo.findDomainWithContext(hostname);
    if (!domain) return { allowed: false, reason: "unknown_host" };
    if (!domain.tenant.isActive) {
      return { allowed: false, reason: "tenant_inactive" };
    }
    if (domain.appType !== "WEBSITE") {
      return { allowed: false, reason: "ims_not_allowed_via_caddy" };
    }
    if (!domain.verifiedAt) {
      return { allowed: false, reason: "not_verified" };
    }
    const siteConfig = domain.tenant_site_config;
    if (!siteConfig || !siteConfig.websiteEnabled) {
      return { allowed: false, reason: "website_disabled" };
    }
    return {
      allowed: true,
      tenantId: domain.tenantId,
      hostname: domain.hostname,
      appType: domain.appType,
    };
  }

  /**
   * Tenant-site renderer: what tenant does this host map to, and is it
   * publishable?
   *
   * Unlike the TLS gate, we *do* resolve unverified hosts here — the
   * renderer will 404 on its own if `isPublished` is false. Separating the
   * two means the renderer can show a "site coming soon" landing if we
   * ever want to, without the TLS gate changing.
   */
  async resolveHost(hostname: string): Promise<ResolveHostResult> {
    const domain = await this.repo.findDomainWithContext(hostname);
    if (!domain) return { resolved: false, reason: "unknown_host" };
    if (!domain.tenant.isActive) {
      return { resolved: false, reason: "tenant_inactive" };
    }
    if (domain.appType !== "WEBSITE") {
      return { resolved: false, reason: "unknown_host" };
    }
    if (!domain.verifiedAt) {
      return { resolved: false, reason: "not_verified" };
    }
    const siteConfig = domain.tenant_site_config;
    if (!siteConfig || !siteConfig.websiteEnabled) {
      return { resolved: false, reason: "website_disabled" };
    }
    return {
      resolved: true,
      tenantId: domain.tenantId,
      tenantSlug: domain.tenant.slug,
      hostname: domain.hostname,
      appType: domain.appType,
      websiteEnabled: siteConfig.websiteEnabled,
      isPublished: siteConfig.isPublished,
      templateSlug: null, // filled by controller when needed
    };
  }
}

export default new InternalService();

export type { DomainWithContext };
