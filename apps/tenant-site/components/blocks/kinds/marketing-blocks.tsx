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
  AnnouncementBarProps,
  CollectionCardsProps,
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
import Link from "next/link";
import type { PublicProduct } from "@/lib/api";
import type { BlockComponentProps } from "../registry";

const TONE_BG: Record<
  NonNullable<AnnouncementBarProps["tone"]>,
  { bg: string; fg: string }
> = {
  default: { bg: "var(--color-text)", fg: "var(--color-background)" },
  muted: { bg: "var(--color-surface)", fg: "var(--color-text)" },
  accent: { bg: "var(--color-accent)", fg: "var(--color-background)" },
};

export function AnnouncementBarBlock({
  props,
}: BlockComponentProps<AnnouncementBarProps>) {
  const tone = TONE_BG[props.tone ?? "default"] ?? TONE_BG.default;
  const items: string[] =
    props.items && props.items.length > 0 ? props.items : [props.text];
  const inner = (
    <span style={{ display: "inline-flex", gap: "3rem", paddingRight: "3rem" }}>
      {items.map((item: string, i: number) => (
        <span key={i}>{item}</span>
      ))}
    </span>
  );
  const content = props.marquee ? (
    <div
      className="announcement-marquee-track"
      style={{
        display: "flex",
        width: "max-content",
        animation: "announcement-marquee 30s linear infinite",
      }}
    >
      {/* Duplicated track so the loop stays seamless. */}
      {inner}
      {inner}
    </div>
  ) : (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <span>{props.text}</span>
    </div>
  );

  const body = (
    <div
      style={{
        background: tone.bg,
        color: tone.fg,
        fontSize: "0.8rem",
        letterSpacing: "0.04em",
        padding: "0.55rem 0",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <style>
        {
          "@keyframes announcement-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } } @media (prefers-reduced-motion: reduce) { .announcement-marquee-track { animation: none !important; } }"
        }
      </style>
      {content}
    </div>
  );

  if (props.link) {
    return (
      <a href={props.link} style={{ display: "block", color: "inherit" }}>
        {body}
      </a>
    );
  }
  return body;
}

const ASPECT_MAP = {
  square: "1 / 1",
  portrait: "3 / 4",
  landscape: "16 / 9",
} as const;

export function CollectionCardsBlock({
  props,
}: BlockComponentProps<CollectionCardsProps>) {
  const aspect = ASPECT_MAP[props.aspectRatio ?? "portrait"];
  const overlay = props.overlay !== false;
  const columns = Math.max(1, Math.min(props.cards.length, 4));
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container">
        {(props.eyebrow || props.heading) && (
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            {props.eyebrow && (
              <div
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                {props.eyebrow}
              </div>
            )}
            {props.heading && (
              <h2
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                {props.heading}
              </h2>
            )}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
            ["--count" as string]: columns,
          }}
        >
          {props.cards.map((card, i) => (
            <CollectionCard
              key={`${i}-${card.title}`}
              card={card}
              aspect={aspect}
              overlay={overlay}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CollectionCard({
  card,
  aspect,
  overlay,
}: {
  card: CollectionCardsProps["cards"][number];
  aspect: string;
  overlay: boolean;
}) {
  const href = card.ctaHref && card.ctaHref.length > 0 ? card.ctaHref : null;
  const hasImage = !!card.imageUrl;
  const sharedStyle: React.CSSProperties = {
    position: "relative",
    display: "block",
    overflow: "hidden",
    borderRadius: "var(--radius)",
    aspectRatio: aspect,
    background: "var(--color-surface)",
    color: "var(--color-text)",
    textDecoration: "none",
  };
  const body = (
    <>
      {hasImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={card.imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.6s ease",
          }}
        />
      )}
      {overlay && hasImage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "1.25rem",
          color: overlay && hasImage ? "#fff" : "var(--color-text)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: card.subtitle ? "0.25rem" : 0,
          }}
        >
          {card.title}
        </div>
        {card.subtitle && (
          <div
            style={{
              fontSize: "0.9rem",
              opacity: overlay && hasImage ? 0.9 : 0.75,
              marginBottom: card.ctaLabel ? "0.75rem" : 0,
            }}
          >
            {card.subtitle}
          </div>
        )}
        {card.ctaLabel && (
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {card.ctaLabel} →
          </span>
        )}
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} style={sharedStyle}>
        {body}
      </Link>
    );
  }
  return <div style={sharedStyle}>{body}</div>;
}

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
                  minHeight: 44,
                  cursor: "pointer",
                  listStyle: "none",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    color: "var(--color-muted)",
                    fontSize: "1.1rem",
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
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
