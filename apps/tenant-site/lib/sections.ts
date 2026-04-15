/**
 * Section-visibility helper.
 *
 * Tenants store per-section on/off booleans in `SiteConfig.features` as
 * free-form JSON. This helper normalizes that into a typed shape with
 * sensible defaults so templates can render a section with a single
 * `sections.story && <StorySplit ... />` check instead of repeatedly
 * casting and coalescing in every file.
 *
 * The keys here are the canonical set. Templates are free to introduce
 * new ones (see `extra` below) — readers just call `readSections()` with
 * the key they care about.
 */

export interface SectionFlags {
  hero: boolean;
  /** Shop-by-category tiles on the homepage. */
  categories: boolean;
  products: boolean;
  /** A product-led "bento" showcase above the grid. */
  bento: boolean;
  /** Brand-story split or centred narrative. */
  story: boolean;
  /** Trust metrics strip (years in business, ratings, etc.). */
  trust: boolean;
  /** Latest blog posts teaser block. */
  articles: boolean;
  /** Contact section on the homepage (separate from /contact page). */
  contact: boolean;
  /** Newsletter email capture strip. */
  newsletter: boolean;
  /** Customer testimonials band. */
  testimonials: boolean;
  /** Lookbook / gallery band (Luxury template uses this). */
  lookbook: boolean;
  /** Free-form overflow for template-specific keys. */
  extra: Record<string, unknown>;
}

const DEFAULTS: SectionFlags = {
  hero: true,
  categories: true,
  products: true,
  bento: false,
  story: false,
  trust: false,
  articles: true,
  contact: false,
  newsletter: false,
  testimonials: false,
  lookbook: false,
  extra: {},
};

function coerceBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * Parse a tenant's `SiteConfig.features` JSON blob into a typed flag set.
 * Unknown keys are preserved under `extra` so templates can opt into
 * template-specific toggles without widening this type.
 */
export function readSections(
  features: Record<string, unknown> | null,
): SectionFlags {
  if (!features) return { ...DEFAULTS, extra: {} };
  const extra: Record<string, unknown> = {};
  const known = new Set<keyof SectionFlags>([
    "hero",
    "categories",
    "products",
    "bento",
    "story",
    "trust",
    "articles",
    "contact",
    "newsletter",
    "testimonials",
    "lookbook",
  ]);
  for (const [k, v] of Object.entries(features)) {
    if (!known.has(k as keyof SectionFlags)) {
      extra[k] = v;
    }
  }
  return {
    hero: coerceBool(features.hero, DEFAULTS.hero),
    categories: coerceBool(features.categories, DEFAULTS.categories),
    products: coerceBool(features.products, DEFAULTS.products),
    bento: coerceBool(features.bento, DEFAULTS.bento),
    story: coerceBool(features.story, DEFAULTS.story),
    trust: coerceBool(features.trust, DEFAULTS.trust),
    articles: coerceBool(features.articles, DEFAULTS.articles),
    contact: coerceBool(features.contact, DEFAULTS.contact),
    newsletter: coerceBool(features.newsletter, DEFAULTS.newsletter),
    testimonials: coerceBool(features.testimonials, DEFAULTS.testimonials),
    lookbook: coerceBool(features.lookbook, DEFAULTS.lookbook),
    extra,
  };
}
