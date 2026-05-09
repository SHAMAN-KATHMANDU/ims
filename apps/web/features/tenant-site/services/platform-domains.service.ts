import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface TenantDomain {
  id: string;
  tenantId: string;
  hostname: string;
  appType: "WEBSITE" | "IMS" | "API";
  isPrimary: boolean;
  dnsVerified: boolean;
  tlsCertificate?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDomainData {
  hostname: string;
  appType: "WEBSITE" | "IMS" | "API";
  isPrimary?: boolean;
}

export interface UpdateDomainData {
  appType?: "WEBSITE" | "IMS" | "API";
  isPrimary?: boolean;
}

export interface DomainVerificationInstructions {
  records: Array<{
    type: "A" | "TXT" | "CNAME";
    name: string;
    value: string;
  }>;
  ttl: number;
}

export interface VerificationResult {
  verified: boolean;
  dnsVerified?: boolean;
  tlsCertificate?: string | null;
  verifiedAt?: string | null;
}

export const platformDomainsService = {
  async listDomains(tenantId: string): Promise<TenantDomain[]> {
    try {
      const { data } = await api.get<{ domains: TenantDomain[] }>(
        `/platform/tenants/${tenantId}/domains`,
      );
      return data.domains ?? [];
    } catch (error) {
      throw handleApiError(error, "listDomains");
    }
  },

  async createDomain(
    tenantId: string,
    payload: CreateDomainData,
  ): Promise<TenantDomain> {
    try {
      const { data } = await api.post<{ domain: TenantDomain }>(
        `/platform/tenants/${tenantId}/domains`,
        payload,
      );
      return data.domain;
    } catch (error) {
      throw handleApiError(error, "createDomain");
    }
  },

  async updateDomain(
    domainId: string,
    payload: UpdateDomainData,
  ): Promise<TenantDomain> {
    try {
      const { data } = await api.patch<{ domain: TenantDomain }>(
        `/platform/domains/${domainId}`,
        payload,
      );
      return data.domain;
    } catch (error) {
      throw handleApiError(error, "updateDomain");
    }
  },

  async deleteDomain(domainId: string): Promise<void> {
    try {
      await api.delete(`/platform/domains/${domainId}`);
    } catch (error) {
      throw handleApiError(error, "deleteDomain");
    }
  },

  async verifyDomain(domainId: string): Promise<VerificationResult> {
    try {
      const { data } = await api.post<VerificationResult>(
        `/platform/domains/${domainId}/verify`,
      );
      return data;
    } catch (error) {
      throw handleApiError(error, "verifyDomain");
    }
  },

  async getDomainVerificationInstructions(
    domainId: string,
  ): Promise<DomainVerificationInstructions> {
    try {
      const { data } = await api.get<DomainVerificationInstructions>(
        `/platform/domains/${domainId}/verification`,
      );
      return data;
    } catch (error) {
      throw handleApiError(error, "getDomainVerificationInstructions");
    }
  },
};
