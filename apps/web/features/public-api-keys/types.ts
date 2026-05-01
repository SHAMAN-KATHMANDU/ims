export interface PublicApiKey {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  rateLimitPerMin: number;
  allowedDomain: {
    id: string;
    hostname: string;
    verifiedAt: string | null;
  };
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatePublicApiKeyData {
  name: string;
  tenantDomainId: string;
  rateLimitPerMin?: number;
}

/** Issued key envelope — `key` is the full secret string, shown ONCE. */
export interface IssuedPublicApiKey {
  key: string;
  apiKey: PublicApiKey;
}
