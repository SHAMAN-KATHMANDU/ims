/**
 * Meta Integration Types
 *
 * Type definitions mirroring the backend API contract for Facebook/Meta integration.
 * Secrets (app secret, tokens) are never exposed in these types — the backend enforces encryption.
 */

export type MetaCredentialKind = "PAGE" | "ADS";

export type ChannelStatus = "ACTIVE" | "PENDING" | "DISCONNECTED" | "ERROR";

export interface MetaCredential {
  id: string;
  kind: MetaCredentialKind;
  externalId: string;
  name: string;
  status: ChannelStatus;
  metadata: Record<string, unknown> | null;
  tokenConfigured: boolean;
  createdAt: string;
  updatedAt: string;
  // PAGE-only inbox wiring (present on PAGE credentials).
  inboxChannelId?: string | null;
  inboxStatus?: string | null;
  webhookSubscribed?: boolean;
}

export interface MetaWebhookInfo {
  /** Callback URL the tenant pastes into their Meta app dashboard. */
  url: string;
  /** Page fields we auto-subscribe to when a Page token is added. */
  subscribedFields: string[];
  /** App-level verify token to paste into the Meta app's Webhooks config. */
  verifyToken: string | null;
}

export interface MetaIntegrationSummary {
  configured: boolean;
  appId: string | null;
  hasAppSecret: boolean;
  graphApiVersion: string;
  defaultPageId: string | null;
  defaultAdAccountId: string | null;
  credentials: MetaCredential[];
  webhook?: MetaWebhookInfo;
  /** Present on add-credential responses when webhook subscription failed. */
  webhookNote?: string;
}

export interface TokenValidationResult {
  kind: MetaCredentialKind;
  page?: {
    id: string;
    name?: string;
    category?: string;
  };
  adAccounts?: Array<{
    id: string;
    account_id?: string;
    name?: string;
  }>;
}
