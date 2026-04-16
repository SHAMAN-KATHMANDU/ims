"use client";

/**
 * gallery block — grid / masonry / slideshow layouts with optional
 * lightbox. Client component because slideshow + lightbox need state.
 */

import { useState } from "react";
import type { GalleryProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

export function GalleryBlock({ props }: BlockComponentProps<GalleryProps>) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  if (props.images.length === 0) return null;

  const ar = props.aspectRatio ?? "auto";

  if (props.layout === "slideshow") {
    const current = props.images[slideIdx];
    return (
      <div style={{ padding: "1rem 0" }}>
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current?.src}
            alt={current?.alt ?? ""}
            style={{
              width: "100%",
              aspectRatio: ar === "auto" ? undefined : ar,
              objectFit: "cover",
              borderRadius: "var(--radius)",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <NavBtn
              onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
              label="Prev"
            >
              ‹
            </NavBtn>
            <span
              style={{
                padding: "0.4rem 0.8rem",
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                borderRadius: "var(--radius)",
                fontSize: "0.8rem",
              }}
            >
              {slideIdx + 1} / {props.images.length}
            </span>
            <NavBtn
              onClick={() =>
                setSlideIdx((i) => Math.min(props.images.length - 1, i + 1))
              }
              label="Next"
            >
              ›
            </NavBtn>
          </div>
        </div>
        {current?.caption && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-muted)",
              textAlign: "center",
              marginTop: "0.5rem",
            }}
          >
            {current.caption}
          </p>
        )}
      </div>
    );
  }

  // Grid / masonry
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(1200 / props.columns) - 20}px, 1fr))`,
          gap: "1rem",
          padding: "1rem 0",
        }}
      >
        {props.images.map((img, i) => (
          <figure key={i} style={{ margin: 0 }}>
            <button
              type="button"
              onClick={() => props.lightbox && setLightboxIdx(i)}
              style={{
                display: "block",
                width: "100%",
                padding: 0,
                border: "none",
                cursor: props.lightbox ? "zoom-in" : "default",
                background: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                style={{
                  width: "100%",
                  aspectRatio: ar === "auto" ? undefined : ar,
                  objectFit: "cover",
                  borderRadius: "var(--radius)",
                  display: "block",
                }}
              />
            </button>
            {img.caption && (
              <figcaption
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-muted)",
                  marginTop: "0.35rem",
                  textAlign: "center",
                }}
              >
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.images[lightboxIdx]?.src}
            alt={props.images[lightboxIdx]?.alt ?? ""}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: "var(--radius)",
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.4rem 0.8rem",
              borderRadius: "var(--radius)",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

function NavBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        padding: "0.4rem 0.7rem",
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        fontSize: "1.2rem",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
