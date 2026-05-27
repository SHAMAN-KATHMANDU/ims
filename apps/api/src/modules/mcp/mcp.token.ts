/**
 * MCP access token sign / verify.
 *
 * Each issued token is backed by an `mcp_tokens` row keyed by the JWT's
 * `jti`. verifyMcpToken checks signature + audience + Zod shape, then
 * looks up the row to enforce revocation and expiry — stateless verify
 * alone would have to wait for the natural exp to kick in.
 *
 * Same secret as core auth (JWT_SECRET) — the `aud` claim ("ims-mcp")
 * prevents replay outside the /mcp surface.
 */

import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "@/config/env";
import { basePrisma } from "@/config/prisma";

const MCP_AUDIENCE = "ims-mcp";
const DEFAULT_MCP_TTL = "30d";

export const McpTokenPayloadSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["platformAdmin", "superAdmin", "admin", "user"]),
  tenantId: z.string().min(1),
  tenantSlug: z.string().min(1),
  username: z.string().optional(),
  jti: z.string().min(1),
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
  /** User-given label persisted on the McpToken row. */
  name: string;
}

export interface SignMcpTokenResult {
  id: string;
  token: string;
  jti: string;
  expiresIn: string;
  expiresAt: Date;
}

export async function signMcpToken(
  input: SignMcpTokenInput,
): Promise<SignMcpTokenResult> {
  const ttl = process.env.MCP_TOKEN_TTL ?? DEFAULT_MCP_TTL;
  const jti = randomUUID();
  const { name, ...claims } = input;

  const token = jwt.sign(claims, env.jwtSecret, {
    expiresIn: ttl as any,
    audience: MCP_AUDIENCE,
    jwtid: jti,
  });

  // jsonwebtoken stamps `exp` (seconds since epoch) when expiresIn is set.
  // Decode it back so we persist the exact same instant the JWT carries.
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    throw new Error("Failed to read exp from freshly-signed MCP token");
  }
  const expiresAt = new Date(decoded.exp * 1000);

  const row = await basePrisma.mcpToken.create({
    data: {
      tenantId: input.tenantId,
      userId: input.id,
      name,
      jti,
      expiresAt,
    },
  });

  return { id: row.id, token, jti, expiresIn: ttl, expiresAt };
}

export async function verifyMcpToken(token: string): Promise<McpTokenPayload> {
  const decoded = jwt.verify(token, env.jwtSecret, {
    audience: MCP_AUDIENCE,
  });
  const payload = McpTokenPayloadSchema.parse(decoded);

  const row = await basePrisma.mcpToken.findUnique({
    where: { jti: payload.jti },
  });

  if (!row) {
    throw new Error("MCP token not found");
  }
  if (row.revokedAt) {
    throw new Error("MCP token revoked");
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    throw new Error("MCP token expired");
  }
  if (row.tenantId !== payload.tenantId || row.userId !== payload.id) {
    throw new Error("MCP token mismatch");
  }

  // Fire-and-forget — don't block the response on the last-used update.
  basePrisma.mcpToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return payload;
}
