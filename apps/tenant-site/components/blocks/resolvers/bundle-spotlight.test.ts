import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  getPublicBundleBySlug: vi.fn(),
}));

import { getPublicBundleBySlug } from "@/lib/api";
import { resolveBundleSpotlight } from "./bundle-spotlight";
import type { ResolverContext } from "./types";
import type { BundleSpotlightProps } from "@repo/shared";

const ctx: ResolverContext = {
  host: "shop.example",
  tenantId: "t1",
  site: {
    locale: "en",
    currency: "NPR",
    branding: null,
    contact: null,
    features: null,
    seo: null,
    template: null,
  },
};

describe("resolveBundleSpotlight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and skips network when slug is empty (unwired block state)", async () => {
    const result = await resolveBundleSpotlight(
      { slug: "" } as BundleSpotlightProps,
      ctx,
    );
    expect(getPublicBundleBySlug).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("trims whitespace before deciding empty", async () => {
    const result = await resolveBundleSpotlight(
      { slug: "   " } as BundleSpotlightProps,
      ctx,
    );
    expect(getPublicBundleBySlug).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("delegates to getPublicBundleBySlug for a real slug", async () => {
    const fake = {
      bundle: {
        id: "b1",
        slug: "starter-kit",
        name: "Starter kit",
      },
      products: [{ id: "p1", name: "Cleanser", finalSp: "100" }],
    };
    (getPublicBundleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
    const result = await resolveBundleSpotlight(
      { slug: "starter-kit" } as BundleSpotlightProps,
      ctx,
    );
    expect(getPublicBundleBySlug).toHaveBeenCalledWith(
      "shop.example",
      "t1",
      "starter-kit",
    );
    expect(result).toBe(fake);
  });

  it("returns null when the API can't find an active bundle", async () => {
    (getPublicBundleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await resolveBundleSpotlight(
      { slug: "missing" } as BundleSpotlightProps,
      ctx,
    );
    expect(result).toBeNull();
  });
});
