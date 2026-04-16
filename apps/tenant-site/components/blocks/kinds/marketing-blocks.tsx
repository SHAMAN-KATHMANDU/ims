/**
 * Marketing blocks — trust strip, story split, bento showcase, stats band,
 * newsletter, contact, FAQ, testimonials, logo cloud.
 *
 * The first six wrap existing shared.tsx primitives. FAQ, testimonials and
 * logo-cloud are new Phase 3 additions — they're simple enough to inline
 * here rather than growing shared.tsx.
 */

import {
  TrustStrip,
  StorySplit,
  BentoShowcase,
  StatsBand,
  NewsletterBand,
  ContactBlock as SharedContactBlock,
} from "@/components/templates/shared";
import type {
  TrustStripProps,
  StorySplitProps,
  BentoShowcaseProps,
  StatsBandProps,
  NewsletterProps,
  ContactBlockProps,
  FaqProps,
  TestimonialsProps,
  LogoCloudProps,
} from "@repo/shared";
import type { PublicProduct } from "@/lib/api";
import type { BlockComponentProps } from "../registry";

export function TrustStripBlock({
  props,
}: BlockComponentProps<TrustStripProps>) {
  return <TrustStrip items={props.items} dark={props.dark} />;
}

export function StorySplitBlock({
  props,
}: BlockComponentProps<StorySplitProps>) {
  return (
    <StorySplit
      eyebrow={props.eyebrow}
      title={props.title}
      body={props.body}
      imageSide={props.imageSide}
      imageCaption={props.imageCaption}
      cta={
        props.ctaHref && props.ctaLabel
          ? { href: props.ctaHref, label: props.ctaLabel }
          : undefined
      }
    />
  );
}

function selectForBento(
  all: PublicProduct[],
  source: BentoShowcaseProps["source"],
  opts: { productIds?: string[]; limit: number },
): PublicProduct[] {
  if (source === "manual" && opts.productIds && opts.productIds.length > 0) {
    const byId = new Map(all.map((p) => [p.id, p] as const));
    return opts.productIds
      .map((id) => byId.get(id))
      .filter((p): p is PublicProduct => !!p)
      .slice(0, opts.limit);
  }
  return all.slice(0, opts.limit);
}

export function BentoShowcaseBlock({
  props,
  dataContext,
}: BlockComponentProps<BentoShowcaseProps>) {
  const products = selectForBento(dataContext.products, props.source, {
    productIds: props.productIds,
    limit: props.limit,
  });
  return (
    <BentoShowcase
      products={products}
      heading={props.heading}
      eyebrow={props.eyebrow}
    />
  );
}

export function StatsBandBlock({ props }: BlockComponentProps<StatsBandProps>) {
  return <StatsBand items={props.items} dark={props.dark} />;
}

export function NewsletterBlock({
  props,
}: BlockComponentProps<NewsletterProps>) {
  return (
    <NewsletterBand
      title={props.title}
      subtitle={props.subtitle}
      cta={props.cta}
    />
  );
}

export function ContactBlock({
  dataContext,
}: BlockComponentProps<ContactBlockProps>) {
  return <SharedContactBlock site={dataContext.site} />;
}

// ---------- FAQ (new) -------------------------------------------------------

export function FaqBlock({ props }: BlockComponentProps<FaqProps>) {
  if (props.items.length === 0) return null;
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container" style={{ maxWidth: 820 }}>
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "2.5rem",
              textAlign: "center",
            }}
          >
            {props.heading}
          </h2>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {props.items.map((item, i) => (
            <details
              key={i}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-background)",
              }}
            >
              <summary
                style={{
                  padding: "1.1rem 1.25rem",
                  cursor: "pointer",
                  listStyle: "none",
                  fontWeight: 500,
                  color: "var(--color-text)",
                }}
              >
                {item.question}
              </summary>
              <div
                style={{
                  padding: "0 1.25rem 1.25rem",
                  lineHeight: 1.65,
                  color: "var(--color-muted)",
                  whiteSpace: "pre-line",
                }}
              >
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Testimonials (new) ----------------------------------------------

export function TestimonialsBlock({
  props,
}: BlockComponentProps<TestimonialsProps>) {
  if (props.items.length === 0) return null;
  return (
    <section
      style={{
        padding: "var(--section-padding) 0",
        background: "var(--color-surface)",
      }}
    >
      <div className="container">
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "2.5rem",
              textAlign: "center",
            }}
          >
            {props.heading}
          </h2>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.75rem",
          }}
        >
          {props.items.map((t, i) => (
            <figure
              key={i}
              style={{
                margin: 0,
                padding: "2rem",
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
              }}
            >
              <blockquote
                style={{
                  margin: "0 0 1.25rem",
                  fontSize: "1rem",
                  lineHeight: 1.65,
                  color: "var(--color-text)",
                }}
              >
                “{t.quote}”
              </blockquote>
              <figcaption
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-muted)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  {t.author}
                </strong>
                {t.role ? ` · ${t.role}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Logo cloud (new) ------------------------------------------------

export function LogoCloudBlock({ props }: BlockComponentProps<LogoCloudProps>) {
  if (props.logos.length === 0) return null;
  const height = props.logoHeight ?? 32;
  const cols = props.columns ?? 4;
  return (
    <section
      style={{
        padding: "3rem 0",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="container" style={{ textAlign: "center" }}>
        {props.heading && (
          <div
            style={{
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--color-muted)",
              marginBottom: "1.75rem",
            }}
          >
            {props.heading}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            justifyItems: "center",
            alignItems: "center",
            gap: "2.5rem",
            opacity: 0.8,
          }}
        >
          {props.logos.map((l, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={l.src}
              alt={l.alt}
              style={{
                height,
                maxWidth: 160,
                objectFit: "contain",
                filter: props.grayscale !== false ? "grayscale(100%)" : "none",
              }}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
