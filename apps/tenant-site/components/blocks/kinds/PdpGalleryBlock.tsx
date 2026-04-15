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
              alt=""
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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: thumbsLeft ? "auto 1fr" : "1fr",
        gap: "1rem",
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
  const [zoomed, setZoomed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => enableZoom && setZoomed((v) => !v)}
      aria-label={enableZoom ? (zoomed ? "Exit zoom" : "Zoom photo") : alt}
      style={{
        display: "block",
        width: "100%",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "var(--color-surface)",
        padding: 0,
        cursor: enableZoom ? "zoom-in" : "default",
      }}
    >
      <div style={{ aspectRatio: "1 / 1", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: zoomed ? "scale(1.6)" : "scale(1)",
            transformOrigin: "center center",
            transition: "transform 0.25s ease",
          }}
        />
      </div>
    </button>
  );
}
