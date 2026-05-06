/**
 * Foxglove & Co. template — home layout
 *
 * Library-paper warmth, literary italic, indexed PLP, marginalia on PDP.
 * Niche: books / stationery.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foxgloveHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free wrapping on every order · Members read 10% off",
      marquee: false,
      tone: "muted",
    }),
    block("nav-bar", {
      brand: "Foxglove & Co.",
      brandStyle: "serif",
      items: [
        { label: "Fiction", href: "/products?category=fiction" },
        { label: "Non-fiction", href: "/products?category=nonfiction" },
        { label: "Poetry", href: "/products?category=poetry" },
        { label: "Stationery", href: "/products?category=stationery" },
        { label: "The reading room", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
    block("hero", {
      variant: "editorial",
      heroLayout: "split-left",
      title: "Quietly read since 2011.",
      subtitle:
        "An independent bookshop and stationer. Hand-picked titles, hard-to-find paperbacks, and the world's softest notebooks.",
      ctaLabel: "Visit the shelves",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      eyebrow: "By shelf",
      heading: "Reading rooms",
      cards: [
        {
          title: "Fiction",
          subtitle: "212 in stock",
          ctaHref: "/products?category=fiction",
        },
        {
          title: "Non-fiction",
          subtitle: "168 in stock",
          ctaHref: "/products?category=nonfiction",
        },
        {
          title: "Poetry",
          subtitle: "94 in stock",
          ctaHref: "/products?category=poetry",
        },
        {
          title: "Stationery",
          subtitle: "76 in stock",
          ctaHref: "/products?category=stationery",
        },
      ],
      aspectRatio: "portrait",
    }),
    block("story-split", {
      eyebrow: "Bookseller's note",
      title: "What we're reading.",
      body: "A monthly column from our buyer. This November: three quiet novels and one loud one, plus the only essay collection we'd lift onto every shelf.",
      imageSide: "right",
      ctaLabel: "Read the column",
      ctaHref: "/blog",
    }),
    block("product-grid", {
      eyebrow: "Currently on the table",
      heading: "Hand-picked, this season",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bare",
      cardAspectRatio: "3/4",
    }),
    block("testimonials", {
      heading: "Voices",
      items: [
        {
          quote: "The closest thing to a corner-shop bookseller, only online.",
          author: "The Bookseller",
        },
        {
          quote: "I trust the shop's instincts more than any algorithm.",
          author: "Anonymous reader",
        },
      ],
      layout: "grid",
      columns: 2,
    }),
    block("newsletter", {
      title: "The Foxglove Letter",
      subtitle:
        "A weekly letter from the buyer. New arrivals, signed copies, and one book we cannot stop thinking about.",
      cta: "Sign up",
      variant: "card",
    }),
    block("footer-columns", {
      showBrand: true,
      brand: "Foxglove & Co.",
      tagline: "An independent bookshop. Quietly read since 2011.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Fiction", href: "/products?category=fiction" },
            { label: "Non-fiction", href: "/products?category=nonfiction" },
            { label: "Poetry", href: "/products?category=poetry" },
            { label: "Stationery", href: "/products?category=stationery" },
          ],
        },
        {
          title: "Read",
          links: [
            { label: "The reading room", href: "/blog" },
            { label: "Bookseller's notes", href: "/blog" },
            { label: "Signed copies", href: "/products?tag=signed" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Wrapping", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
