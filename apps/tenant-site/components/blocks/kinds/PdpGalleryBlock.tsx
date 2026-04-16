"use client";

/**
 * pdp-gallery — interactive product photo gallery.
 *
 * Three layouts:
 *   - thumbs-below: hero above, thumb strip below
 *   - thumbs-left:  thumbs on the left, hero on the right
 *   - stacked:      all photos stacked (no thumbs, no active state)
 *
 * Zoom: when enableZoom is on, clicking the main image toggles a scaled
 * view. Real image-zoom libraries can replace this later — the contract
 * is just "click = bigger image" for Phase 6.
 */

import { useState } from "react";
import type { PdpGalleryProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

export function PdpGalleryBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpGalleryProps>) {
  const product = dataContext.activeProduct;
  if (!product) return null;
  const photos =
    product.photoUrls && product.photoUrls.length > 0
      ? product.photoUrls
      : product.photoUrl
        ? [product.photoUrl]
        : [];

  if (photos.length === 0) {
    return (
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-muted)",
          fontSize: "0.85rem",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
        }}
      >
        {product.imsCode}
      </div>
    );
  }

  if (props.layout === "stacked") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {photos.map((url, i) => (
          <PhotoFrame
            key={i}
            src={url}
            alt={`${product.name} photo ${i + 1}`}
            enableZoom={props.enableZoom}
          />
        ))}
      </div>
    );
  }

  return (
    <GalleryWithThumbs
      photos={photos}
      productName={product.name}
      thumbsLeft={props.layout === "thumbs-left"}
      enableZoom={props.enableZoom}
    />
  );
}

function GalleryWithThumbs({
  photos,
  productName,
  thumbsLeft,
  enableZoom,
}: {
  photos: string[];
  productName: string;
  thumbsLeft: boolean;
  enableZoom: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const main = photos[activeIdx] ?? photos[0]!;

  const thumbs = (
    <div
      style={{
        display: "flex",
        flexDirection: thumbsLeft ? "column" : "row",
        gap: "0.6rem",
        flexWrap: thumbsLeft ? "nowrap" : "wrap",
        maxWidth: thumbsLeft ? 80 : "100%",
      }}
    >
      {photos.map((url, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIdx(i)}
            aria-label={`View photo ${i + 1}`}
            aria-current={isActive ? "true" : undefined}
            style={{
              width: 64,
              height: 64,
              flexShrink: 0,
              border: isActive
                ? "2px solid var(--color-primary)"
                : "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              padding: 0,
              cursor: "pointer",
              background: "var(--color-surface)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </button>
        );
      })}
    </div>
  );

  const mainPhoto = (
    <PhotoFrame src={main} alt={productName} enableZoom={enableZoom} />
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIdx((i) => (i > 0 ? i - 1 : photos.length - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIdx((i) => (i < photos.length - 1 ? i + 1 : 0));
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        display: "grid",
        gridTemplateColumns: thumbsLeft ? "auto 1fr" : "1fr",
        gap: "1rem",
        outline: "none",
      }}
    >
      {thumbsLeft && thumbs}
      <div>
        {mainPhoto}
        {!thumbsLeft && photos.length > 1 && (
          <div style={{ marginTop: "0.75rem" }}>{thumbs}</div>
        )}
      </div>
    </div>
  );
}

function PhotoFrame({
  src,
  alt,
  enableZoom,
}: {
  src: string;
  alt: string;
  enableZoom: boolean;
}) {
  const [origin, setOrigin] = useState("center center");
  const [zoomed, setZoomed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    setZoomed(true);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setZoomed(false)}
      style={{
        width: "100%",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "var(--color-surface)",
        cursor: enableZoom ? "zoom-in" : "default",
      }}
    >
      <div style={{ aspectRatio: "1 / 1", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          decoding="async"
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: zoomed ? "scale(2)" : "scale(1)",
            transformOrigin: origin,
            transition: zoomed ? "none" : "transform 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}
