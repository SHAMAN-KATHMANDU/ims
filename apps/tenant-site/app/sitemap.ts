import { MetadataRoute } from "next";
import { getTenantContext } from "@/lib/tenant";

// Minimal sitemap — lists the static top-level pages. Product-level entries
// can be added later once we decide on a URL strategy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const ctx = await getTenantContext();
    const base = `https://${ctx.host}`;
    return [
      { url: `${base}/`, changeFrequency: "daily", priority: 1 },
      { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
      { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ];
  } catch {
    return [];
  }
}
