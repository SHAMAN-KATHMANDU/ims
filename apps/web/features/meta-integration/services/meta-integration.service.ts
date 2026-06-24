import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { MetaIntegrationSummary, TokenValidationResult } from "../types";

// === Interfaces for Request Bodies ===

export interface UpsertAppCredentialsPayload {
  appId?: string | null;
  appSecret?: string;
  graphApiVersion?: string | null;
  defaultPageId?: string | null;
  defaultAdAccountId?: string | null;
}

export interface TestCredentialPayload {
  kind: "PAGE" | "ADS";
  accessToken: string;
  appSecret?: string;
}

export interface AddCredentialPayload {
  kind: "PAGE" | "ADS";
  externalId: string;
  name: string;
  accessToken: string;
}

// === API Response Types ===

interface GetSummaryResponse {
  message: string;
  integration: MetaIntegrationSummary;
}

interface TestCredentialResponse {
  message: string;
  result: TokenValidationResult;
}

interface AddCredentialResponse {
  message: string;
  integration: MetaIntegrationSummary;
}

interface DeleteCredentialResponse {
  message: string;
  integration: MetaIntegrationSummary;
}

// === API Functions ===

export async function getMetaIntegrationSummary(): Promise<MetaIntegrationSummary> {
  try {
    const res = await api.get<GetSummaryResponse>("/meta-integration");
    return res.data.integration;
  } catch (error) {
    throw handleApiError(error, "getMetaIntegrationSummary");
  }
}

export async function upsertAppCredentials(
  payload: UpsertAppCredentialsPayload,
): Promise<MetaIntegrationSummary> {
  try {
    const res = await api.put<AddCredentialResponse>(
      "/meta-integration/app",
      payload,
    );
    return res.data.integration;
  } catch (error) {
    throw handleApiError(error, "upsertAppCredentials");
  }
}

export async function testCredential(
  payload: TestCredentialPayload,
): Promise<TokenValidationResult> {
  try {
    const res = await api.post<TestCredentialResponse>(
      "/meta-integration/credentials/test",
      payload,
      { skipGlobalErrorToast: true },
    );
    return res.data.result;
  } catch (error) {
    throw handleApiError(error, "testCredential");
  }
}

export async function addCredential(
  payload: AddCredentialPayload,
): Promise<MetaIntegrationSummary> {
  try {
    const res = await api.post<AddCredentialResponse>(
      "/meta-integration/credentials",
      payload,
    );
    return res.data.integration;
  } catch (error) {
    throw handleApiError(error, "addCredential");
  }
}

export async function deleteCredential(
  id: string,
): Promise<MetaIntegrationSummary> {
  try {
    const res = await api.delete<DeleteCredentialResponse>(
      `/meta-integration/credentials/${id}`,
    );
    return res.data.integration;
  } catch (error) {
    throw handleApiError(error, "deleteCredential");
  }
}

export async function regenerateWebhookToken(): Promise<MetaIntegrationSummary> {
  try {
    const res = await api.post<AddCredentialResponse>(
      "/meta-integration/webhook/regenerate-token",
    );
    return res.data.integration;
  } catch (error) {
    throw handleApiError(error, "regenerateWebhookToken");
  }
}
