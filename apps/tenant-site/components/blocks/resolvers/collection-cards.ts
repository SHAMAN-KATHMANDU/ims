import type { CollectionCardsProps } from "@repo/shared";
import { getCollections, type PublicCollectionSummary } from "@/lib/api";
import type { BlockResolver } from "./types";

/**
 * Resolve cards for the CollectionCardsBlock.
 *
 *   - `source="manual"` (or undefined for legacy blocks): returns whatever
 *     `props.cards` declares verbatim, normalized to the resolver's
 *     output shape so the renderer doesn't need a switch on `source`.
 *   - `source="auto"`: hits `/public/collections` and projects each row
 *     into a card — slug becomes the link, subtitle/title come from the
 *     Collection row, no manual content needed.
 */
export interface ResolvedCollectionCard {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
}

export const resolveCollectionCards: BlockResolver<
  CollectionCardsProps,
  ResolvedCollectionCard[]
> = async (props, ctx) => {
  if (props.source === "auto") {
    const collections = await getCollections(ctx.host, ctx.tenantId, {
      limit: props.limit ?? 4,
    });
    return collections.map(toCard);
  }
  // manual (default) — project the user-authored cards array into the
  // resolved shape. Skip cards with no title (renderer shouldn't need to
  // defend against partial entries the inspector should have caught).
  const cards = props.cards ?? [];
  return cards
    .filter((c) => Boolean(c.title))
    .map((c, idx) => ({
      id: `manual-${idx}`,
      title: c.title,
      subtitle: c.subtitle ?? null,
      href: c.ctaHref ?? "#",
      imageUrl: typeof c.imageUrl === "string" ? c.imageUrl : null,
      ctaLabel: c.ctaLabel ?? null,
    }));
};

function toCard(c: PublicCollectionSummary): ResolvedCollectionCard {
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    href: `/collections/${c.slug}`,
    imageUrl: null,
    ctaLabel: "Shop now",
  };
}
