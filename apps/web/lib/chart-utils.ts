/** Snap percentage 0–100 to nearest 5 for data-width (avoids inline styles). */
export function snapWidthPercent(
  v: number,
  mx: number,
):
  | 0
  | 5
  | 10
  | 15
  | 20
  | 25
  | 30
  | 35
  | 40
  | 45
  | 50
  | 55
  | 60
  | 65
  | 70
  | 75
  | 80
  | 85
  | 90
  | 95
  | 100 {
  const pct = Math.min(100, Math.round((v / mx) * 100));
  const buckets = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
    95, 100,
  ] as const;
  return buckets.reduce((a, b) =>
    Math.abs(pct - a) <= Math.abs(pct - b) ? a : b,
  );
}

/** Map value/max (0-1) to heatmap intensity bucket 0-10 (avoids inline styles). */
export function heatmapIntensity(
  value: number,
  max: number,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
  if (max <= 0) return 0;
  const pct = value / max;
  const bucket = Math.min(10, Math.round(pct * 10));
  return bucket as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
}

/** Snap bar height (0–150px) to nearest 25 for data-height (avoids inline styles). */
export function snapBarHeight(px: number): 0 | 25 | 50 | 75 | 100 | 125 | 150 {
  const buckets = [0, 25, 50, 75, 100, 125, 150] as const;
  const clamped = Math.min(150, Math.max(0, Math.round(px)));
  return buckets.reduce((a, b) =>
    Math.abs(clamped - a) <= Math.abs(clamped - b) ? a : b,
  );
}
