export interface McpToken {
  id: string;
  name: string;
  /** Set when the token was issued through the OAuth connector flow (e.g. "Claude"); null for tokens minted on this screen. */
  oauthClientName: string | null;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreateMcpTokenData {
  name: string;
}

/**
 * Issued token envelope — `token` is the full JWT, returned ONLY on
 * the create call. Subsequent list calls never include it again.
 */
export interface IssuedMcpToken {
  id: string;
  name: string;
  token: string;
  expiresIn: string;
  expiresAt: string;
  tokenType: "Bearer";
  audience: "ims-mcp";
  mcpUrl: string;
}
