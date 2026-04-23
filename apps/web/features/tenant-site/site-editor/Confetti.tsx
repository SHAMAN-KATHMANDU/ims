"use client";

import { useMemo } from "react";

const CONFETTI_COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
];

export function Confetti({ pieceCount = 36 }: { pieceCount?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]!;
        const left = Math.random() * 100;
        const delay = Math.random() * 0.2;
        const duration = 1.4 + Math.random() * 0.9;
        const drift = (Math.random() - 0.5) * 160;
        const rotate = Math.random() * 720 - 360;
        const shape = i % 3;
        const size = 6 + Math.random() * 6;
        return { i, color, left, delay, duration, drift, rotate, shape, size };
      }),
    [pieceCount],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      <style>{`
        @keyframes site-editor-confetti {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift, 0), 105vh, 0) rotate(var(--rot, 180deg));
            opacity: 0.6;
          }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.i}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.shape === 1 ? p.size * 1.6 : p.size,
            height: p.shape === 2 ? p.size : p.size,
            borderRadius: p.shape === 2 ? "9999px" : "2px",
            background: p.color,
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rotate}deg`,
            animation: `site-editor-confetti ${p.duration}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
