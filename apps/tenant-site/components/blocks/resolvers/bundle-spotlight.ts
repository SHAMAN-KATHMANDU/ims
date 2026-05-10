import type { BundleSpotlightProps } from "@repo/shared";
import {
  getPublicBundleBySlug,
  type PublicBundleDetail,
  type PublicBundleProduct,
} from "@/lib/api";
import type { BlockResolver } from "./types";

export interface ResolvedBundle {
  bundle: PublicBundleDetail;
  products: PublicBundleProduct[];
}

/**
 * Resolve the Bundle for a BundleSpotlightBlock by its slug. Returns
 * null when the slug is empty or the API can't find an active bundle —
 * the block renders nothing in that case (the editor inspector should
 * surface the unwired state separately).
 */
export const resolveBundleSpotlight: BlockResolver<
  BundleSpotlightProps,
  ResolvedBundle | null
> = async (props, ctx) => {
  const slug = props.slug?.trim();
  if (!slug) return null;
  return getPublicBundleBySlug(ctx.host, ctx.tenantId, slug);
};
