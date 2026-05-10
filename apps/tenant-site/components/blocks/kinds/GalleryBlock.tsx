"use client";

/**
 * gallery block — grid / masonry / slideshow layouts with optional
 * lightbox. Client component because slideshow + lightbox need state.
 */

import { useEffect, useRef, useState } from "react";
import type { GalleryProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { normalizeImageRef } from "@/lib/image";

export function GalleryBlock({
  props,
  dataContext,
}: BlockComponentProps<GalleryProps>) {
  const assets = dataContext?.assets;
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxOpenerRef = useRef<HTMLElement | null>(null);

  // Close lightbox on Escape; restore focus to the opener on close.
  useEffect(() => {
    if (lightboxIdx === null) return;
    lightboxCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") {
        setLightboxIdx((i) =>
          i === null ? i : Math.min(props.images.length - 1, i + 1),
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIdx((i) => (i === null ? i : Math.max(0, i - 1)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, props.images.length]);

  useEffect(() => {
    if (lightboxIdx === null && lightboxOpenerRef.current) {
      lightboxOpenerRef.current.focus();
      lightboxOpenerRef.current = null;
    }
  }, [lightboxIdx]);

  if (props.images.length === 0) return null;

  const ar = props.aspectRatio ?? "auto";

  if (props.layout === "slideshow") {
    const current = props.images[slideIdx];
    return (
      <div
        ref={slideContainerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Gallery slideshow"
        style={{ padding: "1rem 0" }}
      >
        <div
          style={{ position: "relative" }}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${slideIdx + 1} of ${props.images.length}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalizeImageRef(current?.src, assets)}
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
              label="Previous slide"
              disabled={slideIdx === 0}
            >
              ‹
            </NavBtn>
            <span
              aria-live="polite"
              aria-atomic="true"
              style={{
                padding: "0.5rem 0.85rem",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
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
              label="Next slide"
              disabled={slideIdx === props.images.length - 1}
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
              onClick={(e) => {
                if (props.lightbox) {
                  lightboxOpenerRef.current = e.currentTarget;
                  setLightboxIdx(i);
                }
              }}
              aria-label={
                props.lightbox
                  ? `Open ${img.alt || `image ${i + 1}`} in lightbox`
                  : img.alt || `Image ${i + 1}`
              }
              aria-haspopup={props.lightbox ? "dialog" : undefined}
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
                src={normalizeImageRef(img.src, assets)}
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
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${lightboxIdx + 1} of ${props.images.length}`}
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
            src={normalizeImageRef(props.images[lightboxIdx]?.src, assets)}
            alt={props.images[lightboxIdx]?.alt ?? ""}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: "var(--radius)",
              cursor: "default",
            }}
          />
          <button
            ref={lightboxCloseRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
            aria-label="Close lightbox"
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.5rem 0.9rem",
              minWidth: 44,
              minHeight: 44,
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
  disabled,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      style={{
        padding: "0.5rem 0.85rem",
        minWidth: 44,
        minHeight: 44,
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        fontSize: "1.2rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
