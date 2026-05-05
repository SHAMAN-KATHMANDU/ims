/**
 * Site Platform Service — platformAdmin-only API for managing a tenant's
 * domains and website feature. All requests go to /platform/... and require
 * the platformAdmin role.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

// ============================================
// Types
// ============================================

export type TenantDomainApp = "WEBSITE" | "IMS" | "API";
export type TenantDomainTls = "PENDING" | "ACTIVE" | "FAILED";

export interface TenantDomain {
  id: string;
  tenantId: string;
  hostname: string;
  appType: TenantDomainApp;
  isPrimary: boolean;
  verifyToken: string;
  verifiedAt: string | null;
  tlsStatus: TenantDomainTls;
  tlsLastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDomainData {
  hostname: string;
  appType: TenantDomainApp;
  isPrimary?: boolean;
}

export interface UpdateTenantDomainData {
  appType?: TenantDomainApp;
  isPrimary?: boolean;
}

export interface DomainVerificationInstructions {
  hostname: string;
  /** A record name — the hostname itself. */
  aRecordName: string;
  /** Public IPv4 of the platform host. Empty when the platform hasn't configured TENANT_DOMAIN_TARGET_IP. */
  aRecordValue: string;
  txtName: string;
  txtValue: string;
  verifiedAt: string | null;
}

/** Free-text category that replaces the legacy SiteTemplateTier enum. */
export type SiteTemplateCategory = string;

export interface SiteTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: SiteTemplateCategory | null;
  previewImageUrl: string | null;
  defaultBranding: Record<string, unknown> | null;
  defaultSections: Record<string, unknown> | null;
  defaultPages: Record<string, unknown> | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSiteConfig {
  id: string;
  tenantId: string;
  websiteEnabled: boolean;
  templateId: string | null;
  branding: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  seo: Record<string, unknown> | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  template: SiteTemplate | null;
}

// ============================================
// Domains API
// ============================================

export async function getTenantDomains(
  tenantId: string,
  appType?: TenantDomainApp,
): Promise<TenantDomain[]> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.get<{ domains: TenantDomain[] }>(
      `/platform/tenants/${tenantId}/domains`,
      { params: appType ? { appType } : undefined },
    );
    return response.data.domains ?? [];
  } catch (error) {
    handleApiError(error, `fetch domains for tenant "${tenantId}"`);
  }
}

export async function createTenantDomain(
  tenantId: string,
  data: CreateTenantDomainData,
): Promise<TenantDomain> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  if (!data.hostname?.trim()) throw new Error("Hostname is required");
  try {
    const response = await api.post<{ domain: TenantDomain }>(
      `/platform/tenants/${tenantId}/domains`,
      data,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, "create tenant domain");
  }
}

export async function updateTenantDomain(
  domainId: string,
  data: UpdateTenantDomainData,
): Promise<TenantDomain> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    const response = await api.patch<{ domain: TenantDomain }>(
      `/platform/domains/${domainId}`,
      data,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, `update domain "${domainId}"`);
  }
}

export async function deleteTenantDomain(domainId: string): Promise<void> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    await api.delete(`/platform/domains/${domainId}`);
  } catch (error) {
    handleApiError(error, `delete domain "${domainId}"`);
  }
}

export async function getDomainVerificationInstructions(
  domainId: string,
): Promise<DomainVerificationInstructions> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    const response = await api.get<DomainVerificationInstructions>(
      `/platform/domains/${domainId}/verification`,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `fetch verification for domain "${domainId}"`);
  }
}

export async function verifyTenantDomain(
  domainId: string,
): Promise<TenantDomain> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    const response = await api.post<{ domain: TenantDomain }>(
      `/platform/domains/${domainId}/verify`,
      {},
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, `verify domain "${domainId}"`);
  }
}

// ============================================
// Tenant-self Domains API (/tenants/me/domains)
// No tenantId argument — backend infers from JWT.
// ============================================

export async function getMyDomains(
  appType?: TenantDomainApp,
): Promise<TenantDomain[]> {
  try {
    const response = await api.get<{ domains: TenantDomain[] }>(
      "/tenants/me/domains",
      { params: appType ? { appType } : undefined },
    );
    return response.data.domains ?? [];
  } catch (error) {
    handleApiError(error, "fetch my domains");
  }
}

export async function createMyDomain(
  data: CreateTenantDomainData,
): Promise<TenantDomain> {
  if (!data.hostname?.trim()) throw new Error("Hostname is required");
  try {
    const response = await api.post<{ domain: TenantDomain }>(
      "/tenants/me/domains",
      data,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, "create my domain");
  }
}

export async function deleteMyDomain(domainId: string): Promise<void> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    await api.delete(`/tenants/me/domains/${domainId}`);
  } catch (error) {
    handleApiError(error, `delete my domain "${domainId}"`);
  }
}

export async function getMyDomainVerificationInstructions(
  domainId: string,
): Promise<DomainVerificationInstructions> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    const response = await api.get<DomainVerificationInstructions>(
      `/tenants/me/domains/${domainId}/verification`,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `fetch verification for my domain "${domainId}"`);
  }
}

export async function verifyMyDomain(domainId: string): Promise<TenantDomain> {
  if (!domainId?.trim()) throw new Error("Domain ID is required");
  try {
    const response = await api.post<{ domain: TenantDomain }>(
      `/tenants/me/domains/${domainId}/verification`,
      {},
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, `verify my domain "${domainId}"`);
  }
}

// ============================================
// Template catalog (platform-admin)
// ============================================

export async function getSiteTemplates(): Promise<SiteTemplate[]> {
  try {
    const response = await api.get<{ templates: SiteTemplate[] }>(
      "/platform/site-templates",
    );
    return response.data.templates ?? [];
  } catch (error) {
    handleApiError(error, "fetch site templates");
  }
}

// ============================================
// Website feature API
// ============================================

export async function getTenantSiteConfig(
  tenantId: string,
): Promise<TenantSiteConfig> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.get<{ siteConfig: TenantSiteConfig }>(
      `/platform/tenants/${tenantId}/website`,
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, `fetch site config for tenant "${tenantId}"`);
  }
}

export async function enableTenantWebsite(
  tenantId: string,
  templateSlug?: string,
): Promise<TenantSiteConfig> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.post<{ siteConfig: TenantSiteConfig }>(
      `/platform/tenants/${tenantId}/website/enable`,
      templateSlug ? { templateSlug } : {},
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, `enable website for tenant "${tenantId}"`);
  }
}

export async function disableTenantWebsite(
  tenantId: string,
): Promise<TenantSiteConfig> {
  if (!tenantId?.trim()) throw new Error("Tenant ID is required");
  try {
    const response = await api.post<{ siteConfig: TenantSiteConfig }>(
      `/platform/tenants/${tenantId}/website/disable`,
      {},
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, `disable website for tenant "${tenantId}"`);
  }
}
