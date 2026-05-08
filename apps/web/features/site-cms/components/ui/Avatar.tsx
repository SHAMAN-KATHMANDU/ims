"use client";

import type { JSX } from "react";

interface AvatarProps {
  initials?: string;
  name?: string;
  color?: string;
  size?: number;
}

export function Avatar({
  initials,
  name,
  color,
  size = 22,
}: AvatarProps): JSX.Element {
  const ini =
    initials ||
    (name
      ? name
          .split(/\s+/)
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "?");

  const hueSeed = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) : 0;

  const bg = color || `oklch(0.55 0.15 ${(hueSeed * 47) % 360})`;

  return (
    <div
      className="mono"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 600,
        letterSpacing: 0.2,
        boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.1)",
        flexShrink: 0,
      }}
    >
      {ini}
    </div>
  );
}
