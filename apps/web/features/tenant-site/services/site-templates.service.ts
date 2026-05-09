/**
 * Site templates service — API calls for template management.
 * Handles forking, editing, and deleting tenant-owned templates.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { BlockNode, TemplatePageDefinition } from "@repo/shared";

export interface SiteTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  defaultLayouts: Record<string, BlockNode[]> | null;
  defaultThemeTokens: Record<string, unknown> | null;
  defaultBranding: Record<string, unknown> | null;
  defaultSections: Record<string, unknown> | null;
  defaultPages: TemplatePageDefinition[] | null;
  parentTemplateId: string | null;
  ownerTenantId: string | null;
  isPublic: boolean;
  previewImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ForkTemplatePayload {
  name: string;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string | null;
  defaultLayouts?: Record<string, BlockNode[]> | null;
  defaultThemeTokens?: Record<string, unknown> | null;
  defaultBranding?: Record<string, unknown> | null;
  defaultSections?: Record<string, unknown> | null;
  defaultPages?: TemplatePageDefinition[] | null;
}

export const siteTemplatesService = {
  async list(): Promise<SiteTemplate[]> {
    try {
      const { data } = await api.get<{ templates: SiteTemplate[] }>(
        "/site-templates",
      );
      return data.templates ?? [];
    } catch (error) {
      throw handleApiError(error, "list site templates");
    }
  },

  async getById(id: string): Promise<SiteTemplate> {
    try {
      const { data } = await api.get<{ template: SiteTemplate }>(
        `/site-templates/${id}`,
      );
      return data.template;
    } catch (error) {
      throw handleApiError(error, "get site template");
    }
  },

  async fork(id: string, payload: ForkTemplatePayload): Promise<SiteTemplate> {
    try {
      const { data } = await api.post<{ template: SiteTemplate }>(
        `/site-templates/${id}/fork`,
        payload,
      );
      return data.template;
    } catch (error) {
      throw handleApiError(error, "fork site template");
    }
  },

  async update(
    id: string,
    payload: UpdateTemplatePayload,
  ): Promise<SiteTemplate> {
    try {
      const { data } = await api.patch<{ template: SiteTemplate }>(
        `/site-templates/${id}`,
        payload,
      );
      return data.template;
    } catch (error) {
      throw handleApiError(error, "update site template");
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/site-templates/${id}`);
    } catch (error) {
      throw handleApiError(error, "delete site template");
    }
  },

  async updateCanonical(
    id: string,
    payload: UpdateTemplatePayload,
  ): Promise<SiteTemplate> {
    try {
      const { data } = await api.patch<{ template: SiteTemplate }>(
        `/platform/site-templates/${id}`,
        payload,
      );
      return data.template;
    } catch (error) {
      throw handleApiError(error, "update canonical site template");
    }
  },
};
