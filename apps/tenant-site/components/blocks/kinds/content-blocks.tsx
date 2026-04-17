/**
 * Content + structural blocks — the building primitives the layout engine
 * uses to compose pages. All server components; no client state.
 *
 * section   — container with background + padding presets; renders children
 * heading   — one of h1..h4 with optional eyebrow + subtitle
 * rich-text — markdown body (uses the same safe-markdown pipeline as blog)
 * image     — <img> (next/image migration in Phase 8 for commerce blocks)
 * button    — CTA link styled as primary/outline/ghost
 * spacer    — vertical whitespace
 * divider   — horizontal rule
 */

import Link from "next/link";
import type {
  ButtonProps,
  DividerProps,
  HeadingProps,
  ImageProps,
  RichTextProps,
  SectionProps,
  SpacerProps,
} from "@repo/shared";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import type { BlockComponentProps } from "../registry";

// ---------- section ---------------------------------------------------------

const SECTION_PADDING: Record<NonNullable<SectionProps["paddingY"]>, string> = {
  none: "0",
  compact: "2.5rem 0",
  balanced: "var(--section-padding) 0",
  spacious: "calc(var(--section-padding) * 1.75) 0",
};

const SECTION_MAX_WIDTH: Record<
  NonNullable<SectionProps["maxWidth"]>,
  number | string
> = {
  narrow: 640,
  default: 1200,
  wide: 1440,
  full: "100%",
};

const SECTION_BG: Record<NonNullable<SectionProps["background"]>, string> = {
  default: "var(--color-background)",
  surface: "var(--color-surface)",
  accent: "var(--color-accent)",
  inverted: "var(--color-text)",
};

export function SectionBlock({
  props,
  children,
}: BlockComponentProps<SectionProps>) {
  const padding = SECTION_PADDING[props.paddingY ?? "balanced"];
  const maxWidth = SECTION_MAX_WIDTH[props.maxWidth ?? "default"];
  const background = SECTION_BG[props.background ?? "default"];
  const color =
    props.background === "inverted" ? "var(--color-background)" : undefined;
  const hasBgImage = !!props.backgroundImage;
  const overlayGradient =
    props.backgroundOverlay === "dark"
      ? "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55))"
      : props.backgroundOverlay === "light"
        ? "linear-gradient(rgba(255,255,255,0.65), rgba(255,255,255,0.65))"
        : undefined;
  const sectionStyle: React.CSSProperties = {
    padding,
    background: hasBgImage ? undefined : background,
    color:
      hasBgImage && props.backgroundOverlay === "dark"
        ? "var(--color-background)"
        : color,
    ...(hasBgImage
      ? {
          backgroundImage: overlayGradient
            ? `${overlayGradient}, url(${props.backgroundImage})`
            : `url(${props.backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {}),
  };
  return (
    <section style={sectionStyle}>
      <div
        className="container"
        style={{
          maxWidth,
          margin: "0 auto",
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ---------- heading ---------------------------------------------------------

const HEADING_SIZE_MAP: Record<string, string> = {
  sm: "clamp(1rem, 2vw, 1.25rem)",
  md: "clamp(1.4rem, 2.5vw, 1.85rem)",
  lg: "clamp(2rem, 3.5vw, 2.75rem)",
  xl: "clamp(2.5rem, 5vw, 3.5rem)",
};

export function HeadingBlock({ props }: BlockComponentProps<HeadingProps>) {
  const Tag = `h${props.level}` as "h1" | "h2" | "h3" | "h4";
  const size = props.size
    ? HEADING_SIZE_MAP[props.size]
    : props.level === 1
      ? "clamp(2.25rem, 4.5vw, 3.25rem)"
      : props.level === 2
        ? "clamp(1.75rem, 3vw, 2.5rem)"
        : props.level === 3
          ? "clamp(1.4rem, 2.25vw, 1.85rem)"
          : "1.15rem";
  const decorationStyle: React.CSSProperties =
    props.decoration === "underline"
      ? {
          borderBottom: "3px solid var(--color-primary)",
          paddingBottom: "0.5rem",
          display: "inline-block",
        }
      : props.decoration === "gradient"
        ? {
            backgroundImage:
              "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }
        : {};
  return (
    <div
      style={{
        textAlign: props.alignment ?? "start",
        padding: "1rem 0",
      }}
    >
      {props.eyebrow && (
        <div
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            marginBottom: "0.6rem",
          }}
        >
          {props.eyebrow}
        </div>
      )}
      <Tag
        style={{
          fontSize: size,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          lineHeight: 1.15,
          color: "var(--color-text)",
          margin: 0,
          ...decorationStyle,
        }}
      >
        {props.text}
      </Tag>
      {props.subtitle && (
        <p
          style={{
            fontSize: "1.05rem",
            color: "var(--color-muted)",
            marginTop: "0.75rem",
            maxWidth: 640,
            marginInline: props.alignment === "center" ? "auto" : undefined,
            lineHeight: 1.6,
          }}
        >
          {props.subtitle}
        </p>
      )}
    </div>
  );
}

// ---------- rich-text -------------------------------------------------------

const RICH_TEXT_MAX: Record<NonNullable<RichTextProps["maxWidth"]>, number> = {
  narrow: 640,
  default: 820,
  wide: 1100,
};

export function RichTextBlock({ props }: BlockComponentProps<RichTextProps>) {
  return (
    <div
      style={{
        maxWidth: RICH_TEXT_MAX[props.maxWidth ?? "default"],
        marginInline: "auto",
        padding: "1rem 0",
        textAlign: props.alignment ?? "start",
      }}
    >
      <MarkdownBody source={props.source} />
    </div>
  );
}

// ---------- image -----------------------------------------------------------

const IMAGE_SHADOW: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,0.12)",
  md: "0 4px 12px rgba(0,0,0,0.15)",
  lg: "0 8px 28px rgba(0,0,0,0.2)",
};

export function ImageBlock({ props }: BlockComponentProps<ImageProps>) {
  const ar =
    props.aspectRatio && props.aspectRatio !== "auto"
      ? props.aspectRatio
      : undefined;
  const shadow = IMAGE_SHADOW[props.shadow ?? "none"] ?? "none";
  const hoverClass =
    props.hoverEffect === "zoom"
      ? "tpl-img-zoom"
      : props.hoverEffect === "lift"
        ? "tpl-img-lift"
        : "";
  const body = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      loading="lazy"
      className={hoverClass || undefined}
      style={{
        display: "block",
        width: "100%",
        height: ar ? "100%" : "auto",
        objectFit: "cover",
        borderRadius: props.rounded ? "var(--radius)" : 0,
        boxShadow: shadow,
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}
    />
  );
  const inner = ar ? (
    <div style={{ aspectRatio: ar, overflow: "hidden" }}>{body}</div>
  ) : (
    body
  );
  return (
    <figure style={{ margin: 0, padding: "1rem 0" }}>
      {props.link ? (
        <Link href={props.link} style={{ display: "block" }}>
          {inner}
        </Link>
      ) : (
        inner
      )}
      {props.caption && (
        <figcaption
          style={{
            fontSize: "0.8rem",
            color: "var(--color-muted)",
            marginTop: "0.5rem",
            textAlign: "center",
          }}
        >
          {props.caption}
        </figcaption>
      )}
    </figure>
  );
}

// ---------- button ----------------------------------------------------------

const BUTTON_PADDING: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "0.4rem 0.9rem",
  md: "0.65rem 1.3rem",
  lg: "0.9rem 1.75rem",
};

export function ButtonBlock({ props }: BlockComponentProps<ButtonProps>) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: BUTTON_PADDING[props.size ?? "md"],
    minHeight: 44,
    borderRadius: "var(--radius)",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: props.size === "sm" ? "0.85rem" : "0.95rem",
    lineHeight: 1.2,
  };
  const themed: Record<ButtonProps["style"], React.CSSProperties> = {
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary, #fff)",
      border: "1px solid var(--color-primary)",
    },
    outline: {
      background: "transparent",
      color: "var(--color-text)",
      border: "1px solid var(--color-border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text)",
      border: "1px solid transparent",
    },
  };
  return (
    <div
      style={{
        textAlign: props.alignment ?? "start",
        padding: "0.5rem 0",
      }}
    >
      <Link
        href={props.href}
        style={{
          ...base,
          ...themed[props.style],
          ...(props.fullWidth
            ? { width: "100%", justifyContent: "center" }
            : {}),
        }}
      >
        {props.label}
      </Link>
    </div>
  );
}

// ---------- spacer ----------------------------------------------------------

const SPACER_SIZES: Record<SpacerProps["size"], string> = {
  xs: "0.5rem",
  sm: "1rem",
  md: "2rem",
  lg: "4rem",
  xl: "6rem",
};

export function SpacerBlock({ props }: BlockComponentProps<SpacerProps>) {
  const height =
    props.customPx != null ? `${props.customPx}px` : SPACER_SIZES[props.size];
  return <div style={{ height }} />;
}

// ---------- divider ---------------------------------------------------------

export function DividerBlock({ props }: BlockComponentProps<DividerProps>) {
  const variant = props.variant ?? "line";
  const borderStyle =
    variant === "dotted" ? "dotted" : variant === "dashed" ? "dashed" : "solid";
  const color = props.colorToken
    ? `var(--${props.colorToken})`
    : "var(--color-border)";
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px ${borderStyle} ${color}`,
        margin: props.inset ? "2rem 15%" : "2rem 0",
      }}
    />
  );
}
