/**
 * Tenant domains service — custom domain management for tenant sites.
 * Reuses hooks/services from existing DomainPanel in site-editor.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export type DomainAppType = "WEBSITE" | "IMS" | "API";

export interface TenantDomain {
  id: string;
  tenantId: string;
  hostname: string;
  appType: DomainAppType;
  isPrimary: boolean;
  verifiedAt: string | null;
  sslStatus: "pending" | "valid" | "expired";
  sslExpiresAt: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainVerificationInstructions {
  domainId: string;
  aRecordName: string;
  aRecordValue: string | null;
  txtName: string;
  txtValue: string;
}

export interface CreateDomainData {
  hostname: string;
  appType: DomainAppType;
}

export interface UpdateDomainData {
  isPrimary?: boolean;
}

export interface DomainListResponse {
  domains: TenantDomain[];
  total: number;
}

export async function listMyDomains(): Promise<TenantDomain[]> {
  try {
    const response = await api.get<DomainListResponse>("/tenants/me/domains");
    return response.data.domains;
  } catch (error) {
    handleApiError(error, "list domains");
  }
}

export async function getMyDomain(domainId: string): Promise<TenantDomain> {
  try {
    const response = await api.get<{ domain: TenantDomain }>(
      `/tenants/me/domains/${domainId}`,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, "get domain");
  }
}

export async function createMyDomain(
  data: CreateDomainData,
): Promise<TenantDomain> {
  try {
    const response = await api.post<{ domain: TenantDomain }>(
      "/tenants/me/domains",
      data,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, "create domain");
  }
}

export async function updateMyDomain(
  domainId: string,
  data: UpdateDomainData,
): Promise<TenantDomain> {
  try {
    const response = await api.patch<{ domain: TenantDomain }>(
      `/tenants/me/domains/${domainId}`,
      data,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, "update domain");
  }
}

export async function deleteMyDomain(domainId: string): Promise<void> {
  try {
    await api.delete(`/tenants/me/domains/${domainId}`);
  } catch (error) {
    handleApiError(error, "delete domain");
  }
}

export async function verifyMyDomain(domainId: string): Promise<TenantDomain> {
  try {
    const response = await api.post<{ domain: TenantDomain }>(
      `/tenants/me/domains/${domainId}/verification`,
    );
    return response.data.domain;
  } catch (error) {
    handleApiError(error, "verify domain");
  }
}

export async function getMyDomainVerificationInstructions(
  domainId: string,
): Promise<DomainVerificationInstructions> {
  try {
    const response = await api.get<{
      instructions: DomainVerificationInstructions;
    }>(`/tenants/me/domains/${domainId}/verification`);
    return response.data.instructions;
  } catch (error) {
    handleApiError(error, "get verification instructions");
  }
}
