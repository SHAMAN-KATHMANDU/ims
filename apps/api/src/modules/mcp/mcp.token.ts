/**
 * MCP access token sign / verify.
 *
 * Trades a short JWT for a long-lived MCP-scoped token. Same secret as
 * core auth (JWT_SECRET) — the `aud` claim ("ims-mcp") prevents replay
 * outside the /mcp surface, and `verifyMcpToken` rejects anything missing
 * that audience.
 */

import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "@/config/env";

const MCP_AUDIENCE = "ims-mcp";
const DEFAULT_MCP_TTL = "30d";

export const McpTokenPayloadSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["platformAdmin", "superAdmin", "admin", "user"]),
  tenantId: z.string().min(1),
  tenantSlug: z.string().min(1),
  username: z.string().optional(),
  aud: z.union([z.literal(MCP_AUDIENCE), z.array(z.string())]),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type McpTokenPayload = z.infer<typeof McpTokenPayloadSchema>;

export interface SignMcpTokenInput {
  id: string;
  role: "platformAdmin" | "superAdmin" | "admin" | "user";
  tenantId: string;
  tenantSlug: string;
  username?: string;
}

export function signMcpToken(input: SignMcpTokenInput): {
  token: string;
  expiresIn: string;
} {
  const ttl = process.env.MCP_TOKEN_TTL ?? DEFAULT_MCP_TTL;
  const token = jwt.sign(input, env.jwtSecret, {
    expiresIn: ttl as any,
    audience: MCP_AUDIENCE,
  });
  return { token, expiresIn: ttl };
}

export function verifyMcpToken(token: string): McpTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret, {
    audience: MCP_AUDIENCE,
  });
  return McpTokenPayloadSchema.parse(decoded);
}
