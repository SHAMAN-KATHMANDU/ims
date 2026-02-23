/**
 * Server-safe Platform Billing Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import type { AddOnPricing } from "@/services/usageService";

/**
 * Fetch add-on pricing list. Use in Server Components (platform admin).
 */
export async function getAddOnPricingListServer(
  cookie: string | null | undefined,
): Promise<AddOnPricing[]> {
  const response = await fetchServer("/platform/add-on-pricing", {
    cookie: cookie ?? undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch add-on pricing (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.pricing ?? [];
}
