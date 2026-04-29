/**
 * Redirects Service — tenant URL redirect rules.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface TenantRedirect {
  id: string;
  tenantId: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRedirectData {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  isActive: boolean;
}

export interface UpdateRedirectData {
  fromPath?: string;
  toPath?: string;
  statusCode?: 301 | 302;
  isActive?: boolean;
}

export const redirectsService = {
  async listAll(): Promise<TenantRedirect[]> {
    try {
      const res = await api.get<{ data: { redirects: TenantRedirect[] } }>(
        "/sites/redirects",
      );
      return res.data.data?.redirects ?? [];
    } catch (error) {
      handleApiError(error, "fetch redirects");
      return [];
    }
  },

  async create(data: CreateRedirectData): Promise<TenantRedirect> {
    try {
      const res = await api.post<{ data: { redirect: TenantRedirect } }>(
        "/sites/redirects",
        data,
      );
      return res.data.data.redirect;
    } catch (error) {
      handleApiError(error, "create redirect");
      throw error;
    }
  },

  async update(id: string, data: UpdateRedirectData): Promise<TenantRedirect> {
    try {
      const res = await api.put<{ data: { redirect: TenantRedirect } }>(
        `/sites/redirects/${id}`,
        data,
      );
      return res.data.data.redirect;
    } catch (error) {
      handleApiError(error, "update redirect");
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/sites/redirects/${id}`);
    } catch (error) {
      handleApiError(error, "delete redirect");
      throw error;
    }
  },
};
