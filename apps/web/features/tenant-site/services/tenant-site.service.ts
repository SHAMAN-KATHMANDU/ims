/**
 * Tenant Site Service — tenant-scoped endpoints under /sites/*.
 * Available to tenant admin / superAdmin roles after the platform has
 * enabled the website feature for the tenant.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

// ============================================
// Types
// ============================================

/**
 * Free-text template category — replaces the legacy SiteTemplateTier enum.
 * The picker UI groups templates by this string; platform admins can add
 * new categories without a schema migration.
 */
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

export interface SiteConfig {
  id: string;
  tenantId: string;
  websiteEnabled: boolean;
  templateId: string | null;
  branding: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  seo: Record<string, unknown> | null;
  themeTokens: Record<string, unknown> | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  template: SiteTemplate | null;
}

export interface UpdateSiteConfigData {
  branding?: Record<string, unknown> | null;
  contact?: Record<string, unknown> | null;
  features?: Record<string, unknown> | null;
  seo?: Record<string, unknown> | null;
  themeTokens?: Record<string, unknown> | null;
}

// ============================================
// API
// ============================================

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const response = await api.get<{ siteConfig: SiteConfig }>("/sites/config");
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, "fetch site config");
  }
}

export async function updateSiteConfig(
  data: UpdateSiteConfigData,
): Promise<SiteConfig> {
  try {
    const response = await api.put<{ siteConfig: SiteConfig }>(
      "/sites/config",
      data,
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, "update site config");
  }
}

export async function listSiteTemplates(): Promise<SiteTemplate[]> {
  try {
    const response = await api.get<{ templates: SiteTemplate[] }>(
      "/sites/templates",
    );
    return response.data.templates ?? [];
  } catch (error) {
    handleApiError(error, "fetch site templates");
  }
}

export async function pickSiteTemplate(
  templateSlug: string,
  resetBranding: boolean,
): Promise<SiteConfig> {
  if (!templateSlug?.trim()) throw new Error("Template slug is required");
  try {
    const response = await api.post<{ siteConfig: SiteConfig }>(
      "/sites/template",
      { templateSlug, resetBranding },
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, "pick site template");
  }
}

export async function publishSite(): Promise<SiteConfig> {
  try {
    const response = await api.post<{ siteConfig: SiteConfig }>(
      "/sites/publish",
      {},
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, "publish site");
  }
}

export async function unpublishSite(): Promise<SiteConfig> {
  try {
    const response = await api.post<{ siteConfig: SiteConfig }>(
      "/sites/unpublish",
      {},
    );
    return response.data.siteConfig;
  } catch (error) {
    handleApiError(error, "unpublish site");
  }
}

// ============================================
// Analytics
// ============================================

export interface SiteAnalytics {
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  metaPixelId?: string;
  consentMode?: "basic" | "granted";
}

export async function getSiteAnalytics(): Promise<SiteAnalytics> {
  try {
    const response = await api.get<{ analytics: SiteAnalytics }>(
      "/sites/analytics",
    );
    return response.data.analytics ?? {};
  } catch (error) {
    handleApiError(error, "fetch site analytics");
  }
}

export async function updateSiteAnalytics(
  data: SiteAnalytics,
): Promise<SiteAnalytics> {
  try {
    const response = await api.put<{ analytics: SiteAnalytics }>(
      "/sites/analytics",
      data,
    );
    return response.data.analytics ?? {};
  } catch (error) {
    handleApiError(error, "update site analytics");
  }
}
