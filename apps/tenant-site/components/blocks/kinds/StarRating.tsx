/**
 * StarRating — compact 0–5 star badge used by reviews-list, ProductCard,
 * and the PDP buybox summary. Renders five SVG stars; the fractional
 * half-star is approximated by clipping the fifth-star's fill width so
 * a 4.3 rating reads as "four full + one ~30% filled" without extra DOM.
 */

import type { CSSProperties } from "react";

interface StarRatingProps {
  /** 0–5 inclusive. Clamped internally. */
  value: number;
  size?: "sm" | "md" | "lg";
  /**
   * Optional visually-hidden label override. Defaults to "Rated X out of 5".
   * When embedded next to a numeric readout, pass aria-hidden from the
   * caller and hide this label via `hideLabel`.
   */
  label?: string;
  hideLabel?: boolean;
}

const SIZE_PX: Record<NonNullable<StarRatingProps["size"]>, number> = {
  sm: 14,
  md: 18,
  lg: 22,
};

export function StarRating({
  value,
  size = "md",
  label,
  hideLabel,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const px = SIZE_PX[size];
  const stars = [0, 1, 2, 3, 4];
  const srLabel = label ?? `Rated ${clamped.toFixed(1)} out of 5`;
  return (
    <span
      role={hideLabel ? undefined : "img"}
      aria-label={hideLabel ? undefined : srLabel}
      aria-hidden={hideLabel ? true : undefined}
      style={{ display: "inline-flex", gap: 2, lineHeight: 0 }}
    >
      {stars.map((i) => {
        const fillPct = Math.max(0, Math.min(1, clamped - i)) * 100;
        return <SingleStar key={i} fillPct={fillPct} px={px} />;
      })}
    </span>
  );
}

function SingleStar({ fillPct, px }: { fillPct: number; px: number }) {
  const shared: CSSProperties = {
    display: "inline-block",
    width: px,
    height: px,
  };
  const path =
    "M10 1.5l2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L10 15.02l-5.3 2.8 1.01-5.91L1.42 7.73l5.93-.86L10 1.5z";
  return (
    <span style={{ position: "relative", ...shared }}>
      <svg
        viewBox="0 0 20 20"
        width={px}
        height={px}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <path d={path} fill="var(--color-border)" />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          width: `${fillPct}%`,
        }}
      >
        <svg
          viewBox="0 0 20 20"
          width={px}
          height={px}
          aria-hidden="true"
          preserveAspectRatio="xMinYMid meet"
        >
          <path d={path} fill="var(--color-rating, #f5a524)" />
        </svg>
      </span>
    </span>
  );
}
