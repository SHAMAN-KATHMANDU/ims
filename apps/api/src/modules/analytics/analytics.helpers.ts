/**
 * Shared helpers for analytics service modules.
 */

import type * as repo from "./analytics.repository";

type SaleWhere = repo.SaleWhere;

export function withTenant(where: SaleWhere, tenantId: string): SaleWhere {
  return { ...where, tenantId };
}

export function monthDifference(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
