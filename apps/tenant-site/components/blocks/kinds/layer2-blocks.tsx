/**
 * Layer 2 blocks — embed, video, accordion, columns.
 *
 * All server components except the accordion in single-open mode (which
 * needs client-side state to enforce one-at-a-time). The embed and video
 * blocks render iframes / native <video> — no third-party dependencies.
 */

import type {
  AccordionProps,
  ColumnsProps,
  CssGridProps,
  EmbedProps,
  VideoProps,
} from "@repo/shared";
import type { BlockComponentProps } from "../registry";

// ---------- embed -----------------------------------------------------------

export function EmbedBlock({ props }: BlockComponentProps<EmbedProps>) {
  const ar = props.aspectRatio ?? "16/9";
  return (
    <figure style={{ margin: 0, padding: "1rem 0" }}>
      <div
        style={{
          position: "relative",
          aspectRatio: ar === "auto" ? undefined : ar,
          overflow: "hidden",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-border)",
        }}
      >
        <iframe
          src={props.src}
          title={props.title ?? "Embedded content"}
          allowFullScreen={props.allowFullscreen !== false}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          style={{
            position: ar === "auto" ? "relative" : "absolute",
            inset: 0,
            width: "100%",
            height: ar === "auto" ? (props.height ?? 400) : "100%",
            border: "none",
          }}
        />
      </div>
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

// ---------- video -----------------------------------------------------------

function youtubeEmbedUrl(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function vimeoEmbedUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
}

export function VideoBlock({ props }: BlockComponentProps<VideoProps>) {
  const ar = props.aspectRatio ?? "16/9";

  if (props.source === "mp4") {
    return (
      <figure style={{ margin: 0, padding: "1rem 0" }}>
        <video
          src={props.url}
          controls
          autoPlay={props.autoplay}
          loop={props.loop}
          muted={props.muted}
          playsInline
          poster={props.posterUrl}
          style={{
            width: "100%",
            aspectRatio: ar,
            objectFit: "cover",
            borderRadius: props.rounded ? "var(--radius)" : "var(--radius)",
            background: "var(--color-surface)",
            display: "block",
          }}
        />
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

  const embedUrl =
    props.source === "youtube"
      ? youtubeEmbedUrl(props.url)
      : vimeoEmbedUrl(props.url);

  const params = new URLSearchParams();
  if (props.autoplay) params.set("autoplay", "1");
  if (props.loop) params.set("loop", "1");
  if (props.muted) params.set("mute", "1");
  const qs = params.toString();
  const src = qs ? `${embedUrl}?${qs}` : embedUrl;

  return (
    <figure style={{ margin: 0, padding: "1rem 0" }}>
      <div
        style={{
          position: "relative",
          aspectRatio: ar,
          overflow: "hidden",
          borderRadius: "var(--radius)",
          background: "var(--color-surface)",
        }}
      >
        <iframe
          src={src}
          title={props.caption ?? "Video"}
          allowFullScreen
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
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

// ---------- accordion -------------------------------------------------------

export function AccordionBlock({
  node,
  props,
}: BlockComponentProps<AccordionProps>) {
  if (props.items.length === 0) return null;
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
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
              name={props.allowMultiple ? undefined : "accordion-group"}
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
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <span>{item.title}</span>
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
                {item.body}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- columns ---------------------------------------------------------

const GAP_MAP: Record<NonNullable<ColumnsProps["gap"]>, string> = {
  sm: "1rem",
  md: "2rem",
  lg: "3rem",
};

const STACK_BREAKPOINT_PX: Record<
  NonNullable<ColumnsProps["stackBelow"]>,
  number
> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

export function ColumnsBlock({
  node,
  props,
  children,
}: BlockComponentProps<ColumnsProps>) {
  const gap = GAP_MAP[props.gap ?? "md"];
  const stackPx = props.stackBelow
    ? STACK_BREAKPOINT_PX[props.stackBelow]
    : undefined;
  const stickyFirst = props.stickyFirst === true;
  const instanceClass = `tpl-cols-${node.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const rules: string[] = [];
  if (stackPx !== undefined) {
    rules.push(
      `@media (max-width: ${stackPx - 1}px) { .${instanceClass} { grid-template-columns: 1fr !important; } .${instanceClass} > :first-child { position: static !important; top: auto !important; } }`,
    );
  }
  if (stickyFirst) {
    const minWidth = stackPx ?? 0;
    rules.push(
      `@media (min-width: ${minWidth}px) { .${instanceClass} > :first-child { position: sticky; top: 1.5rem; align-self: start; } }`,
    );
  }
  return (
    <div
      className={`tpl-stack ${instanceClass}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${props.count}, 1fr)`,
        gap,
        alignItems: props.verticalAlign ?? "start",
      }}
    >
      {rules.length > 0 && <style>{rules.join(" ")}</style>}
      {children}
    </div>
  );
}

// ---------- css-grid --------------------------------------------------------

export function CssGridBlock({
  props,
  children,
}: BlockComponentProps<CssGridProps>) {
  const gap = GAP_MAP[props.gap ?? "md"];
  return (
    <div
      className="tpl-stack"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(props.columns, 12)}, 1fr)`,
        gap,
        gridAutoRows: props.minRowHeight ?? "auto",
      }}
    >
      {children}
    </div>
  );
}
