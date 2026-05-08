/**
 * lookbook block — editorial scenes with pinned "shop this look" hot
 * spots. Each pin is an absolutely-positioned link anchored by
 * normalized x/y (0–1) so the layout holds on any aspect ratio.
 *
 * Server-rendered; no client state. Pin hovers use CSS only. Tenants
 * drive the data from the page editor.
 */

import Link from "next/link";
import type { LookbookProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { normalizeImageRef } from "@/lib/image";

export function LookbookBlock({
  node,
  props,
}: BlockComponentProps<LookbookProps>) {
  if (props.scenes.length === 0) return null;
  const aspectRatio = props.aspectRatio ?? "4/5";
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display)",
              marginBottom: props.description ? "0.5rem" : "2rem",
              textAlign: "center",
            }}
          >
            {props.heading}
          </h2>
        )}
        {props.description && (
          <p
            style={{
              color: "var(--color-muted)",
              marginBottom: "2.5rem",
              textAlign: "center",
              maxWidth: 640,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            {props.description}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              props.scenes.length === 1
                ? "1fr"
                : "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {props.scenes.map((scene, i) => (
            <figure
              key={i}
              style={{
                margin: 0,
                position: "relative",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                background: "var(--color-surface)",
              }}
            >
              <div style={{ position: "relative", aspectRatio }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={normalizeImageRef(scene.imageUrl)}
                  alt={scene.alt ?? ""}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {scene.pins.map((pin, pi) => (
                  <Link
                    key={pi}
                    href={`/products/${pin.productId}`}
                    aria-label={pin.label ?? `Shop pinned product ${pi + 1}`}
                    className="tpl-lookbook-pin"
                    style={{
                      position: "absolute",
                      left: `${pin.x * 100}%`,
                      top: `${pin.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      width: 28,
                      height: 28,
                      minWidth: 44,
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--color-background)",
                        border: "2px solid var(--color-text)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                        display: "inline-block",
                      }}
                    />
                  </Link>
                ))}
              </div>
              {scene.caption && (
                <figcaption
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.9rem",
                    color: "var(--color-muted)",
                    textAlign: "center",
                  }}
                >
                  {scene.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
