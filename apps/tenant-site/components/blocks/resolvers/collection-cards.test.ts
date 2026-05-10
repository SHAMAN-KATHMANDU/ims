import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  getCollections: vi.fn(),
}));

import { getCollections } from "@/lib/api";
import { resolveCollectionCards } from "./collection-cards";
import type { ResolverContext } from "./types";
import type { CollectionCardsProps } from "@repo/shared";

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

describe("resolveCollectionCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("source=auto fetches collections from /public/collections and projects each to a card", async () => {
    (getCollections as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "c1", slug: "hero", title: "Hero", subtitle: "First in" },
      { id: "c2", slug: "calm", title: "Calm", subtitle: null },
    ]);
    const props: CollectionCardsProps = { source: "auto", limit: 4 };
    const cards = await resolveCollectionCards(props, ctx);
    expect(getCollections).toHaveBeenCalledWith("shop.example", "t1", {
      limit: 4,
    });
    expect(cards).toEqual([
      {
        id: "c1",
        title: "Hero",
        subtitle: "First in",
        href: "/collections/hero",
        imageUrl: null,
        ctaLabel: "Shop now",
      },
      {
        id: "c2",
        title: "Calm",
        subtitle: null,
        href: "/collections/calm",
        imageUrl: null,
        ctaLabel: "Shop now",
      },
    ]);
  });

  it("source=auto with no collections returns empty list (block hides itself)", async () => {
    (getCollections as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const cards = await resolveCollectionCards({ source: "auto" }, ctx);
    expect(cards).toEqual([]);
  });

  it("source=manual projects authored cards into the resolved shape", async () => {
    const props: CollectionCardsProps = {
      source: "manual",
      cards: [
        {
          title: "Featured",
          subtitle: "Editor picks",
          ctaHref: "/collections/featured",
          ctaLabel: "Shop featured",
        },
        // Card with no title is dropped — defends against a bug in the
        // inspector that allows partial entries through.
        { title: "" },
      ],
    };
    const cards = await resolveCollectionCards(props, ctx);
    expect(getCollections).not.toHaveBeenCalled();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      title: "Featured",
      subtitle: "Editor picks",
      href: "/collections/featured",
      ctaLabel: "Shop featured",
    });
  });

  it("undefined source defaults to manual (backward compat for legacy blocks)", async () => {
    const props: CollectionCardsProps = {
      cards: [{ title: "Legacy", ctaHref: "/legacy" }],
    };
    const cards = await resolveCollectionCards(props, ctx);
    expect(getCollections).not.toHaveBeenCalled();
    expect(cards.map((c) => c.title)).toEqual(["Legacy"]);
  });
});
