/**
 * Zod schemas for /internal/* endpoints (Caddy on_demand_tls ask hook,
 * tenant-site host resolver).
 */

import { z } from "zod";

const hostnameRegex =
  /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;

const hostnameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(hostnameRegex, "Invalid hostname");

/** Caddy sends `?domain=<host>` when its `ask` hook fires. */
export const DomainAllowedQuerySchema = z.object({
  domain: hostnameField,
});

/** Tenant-site middleware sends `?host=<host>` on every incoming request. */
export const ResolveHostQuerySchema = z.object({
  host: hostnameField,
});

/** Tenant-site middleware sends `?tenantId=<id>` to fetch redirect rules. */
export const GetRedirectsQuerySchema = z.object({
  tenantId: z.string().uuid("tenantId must be a UUID"),
});

export type DomainAllowedQuery = z.infer<typeof DomainAllowedQuerySchema>;
export type ResolveHostQuery = z.infer<typeof ResolveHostQuerySchema>;
export type GetRedirectsQuery = z.infer<typeof GetRedirectsQuerySchema>;
