/**
 * Redirects Service — tenant-scoped endpoints under /sites/redirects/*.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface Redirect {
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
  statusCode?: 301 | 302;
  isActive?: boolean;
}

export type UpdateRedirectData = Partial<CreateRedirectData>;

export interface ListRedirectsResponse {
  redirects: Redirect[];
}

export interface RedirectResponse {
  redirect: Redirect;
}

export async function listRedirects(): Promise<Redirect[]> {
  try {
    const response = await api.get<ListRedirectsResponse>("/sites/redirects");
    return response.data.redirects;
  } catch (error) {
    handleApiError(error, "list redirects");
  }
}

export async function getRedirect(id: string): Promise<Redirect> {
  try {
    const response = await api.get<RedirectResponse>(`/sites/redirects/${id}`);
    return response.data.redirect;
  } catch (error) {
    handleApiError(error, `get redirect "${id}"`);
  }
}

export async function createRedirect(
  data: CreateRedirectData,
): Promise<Redirect> {
  try {
    const response = await api.post<RedirectResponse>("/sites/redirects", data);
    return response.data.redirect;
  } catch (error) {
    handleApiError(error, "create redirect");
  }
}

export async function updateRedirect(
  id: string,
  data: UpdateRedirectData,
): Promise<Redirect> {
  try {
    const response = await api.put<RedirectResponse>(
      `/sites/redirects/${id}`,
      data,
    );
    return response.data.redirect;
  } catch (error) {
    handleApiError(error, `update redirect "${id}"`);
  }
}

export async function deleteRedirect(id: string): Promise<void> {
  try {
    await api.delete(`/sites/redirects/${id}`);
  } catch (error) {
    handleApiError(error, `delete redirect "${id}"`);
  }
}
