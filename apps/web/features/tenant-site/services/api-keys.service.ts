import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface ApiKey {
  id: string;
  tenantId: string;
  tenantDomainId: string;
  name: string;
  prefix: string;
  lastFour: string;
  rateLimitPerMin?: number | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string;
}

export interface CreateApiKeyData {
  name: string;
  tenantDomainId: string;
  rateLimitPerMin?: number;
}

export interface RotateApiKeyData {
  name?: string;
  rateLimitPerMin?: number;
}

export const apiKeysService = {
  async listApiKeys(): Promise<ApiKey[]> {
    try {
      const { data } = await api.get<{ keys: ApiKey[] }>("/public-api-keys");
      return data.keys ?? [];
    } catch (error) {
      throw handleApiError(error, "listApiKeys");
    }
  },

  async createApiKey(payload: CreateApiKeyData): Promise<ApiKeyWithSecret> {
    try {
      const { data } = await api.post<ApiKeyWithSecret>(
        "/public-api-keys",
        payload,
      );
      return data;
    } catch (error) {
      throw handleApiError(error, "createApiKey");
    }
  },

  async rotateApiKey(
    keyId: string,
    payload?: RotateApiKeyData,
  ): Promise<ApiKeyWithSecret> {
    try {
      const { data } = await api.post<ApiKeyWithSecret>(
        `/public-api-keys/${keyId}/rotate`,
        payload || {},
      );
      return data;
    } catch (error) {
      throw handleApiError(error, "rotateApiKey");
    }
  },

  async deleteApiKey(keyId: string): Promise<void> {
    try {
      await api.delete(`/public-api-keys/${keyId}`);
    } catch (error) {
      throw handleApiError(error, "deleteApiKey");
    }
  },
};
