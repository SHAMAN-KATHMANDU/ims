import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type {
  CreatePublicApiKeyData,
  IssuedPublicApiKey,
  PublicApiKey,
} from "../types";

// Note: api.* response.data is the unwrapped payload from the {success,data}
// envelope (handled by the global axios interceptor in apps/web/lib/axios.ts).

export async function listPublicApiKeys(): Promise<PublicApiKey[]> {
  try {
    const res = await api.get<{ apiKeys: PublicApiKey[] }>("/public-api-keys");
    return res.data.apiKeys ?? [];
  } catch (error) {
    handleApiError(error, "list public API keys");
  }
}

export async function createPublicApiKey(
  payload: CreatePublicApiKeyData,
): Promise<IssuedPublicApiKey> {
  if (!payload.name?.trim()) throw new Error("Name is required");
  if (!payload.tenantDomainId?.trim()) {
    throw new Error("Tenant domain is required");
  }
  try {
    const res = await api.post<IssuedPublicApiKey>("/public-api-keys", payload);
    return res.data;
  } catch (error) {
    handleApiError(error, "create public API key");
  }
}

export async function rotatePublicApiKey(
  id: string,
): Promise<{ key: string; apiKey: PublicApiKey; revokedId: string }> {
  try {
    const res = await api.post<{
      key: string;
      apiKey: PublicApiKey;
      revokedId: string;
    }>(`/public-api-keys/${id}/rotate`, {});
    return res.data;
  } catch (error) {
    handleApiError(error, `rotate public API key "${id}"`);
  }
}

export async function revokePublicApiKey(id: string): Promise<void> {
  try {
    await api.delete(`/public-api-keys/${id}`);
  } catch (error) {
    handleApiError(error, `revoke public API key "${id}"`);
  }
}
