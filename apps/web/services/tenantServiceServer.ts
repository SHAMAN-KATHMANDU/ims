/**
 * Server-safe Tenant Service (platform admin).
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import { type Tenant, type PlatformStats } from "@/services/tenantService";

/**
 * Fetch platform stats. Use in Server Components (platform admin).
 */
export async function getPlatformStatsServer(
  cookie: string | null | undefined,
): Promise<PlatformStats> {
  const response = await fetchServer("/platform/stats", {
    cookie: cookie ?? undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch platform stats (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch all tenants. Use in Server Components (platform admin).
 */
export async function getTenantsServer(
  cookie: string | null | undefined,
): Promise<Tenant[]> {
  const response = await fetchServer("/platform/tenants", {
    cookie: cookie ?? undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch tenants (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.tenants ?? [];
}

/**
 * Fetch a single tenant by ID. Use in Server Components (platform admin).
 */
export async function getTenantServer(
  cookie: string | null | undefined,
  id: string,
): Promise<Tenant> {
  if (!id?.trim()) {
    throw new Error("Tenant ID is required");
  }

  const response = await fetchServer(`/platform/tenants/${id}`, {
    cookie: cookie ?? undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch tenant (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.tenant;
}
