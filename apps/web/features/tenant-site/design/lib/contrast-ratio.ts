/**
 * WCAG contrast ratio calculation.
 * Used to display contrast ratios between foreground and background colors.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r = 0, g = 0, b = 0] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const norm = c / 255;
    return norm <= 0.03928
      ? norm / 12.92
      : Math.pow((norm + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(
  color1: string,
  color2: string,
): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastRatioString(color1: string, color2: string): string {
  const ratio = getContrastRatio(color1, color2);
  if (ratio === null) return "—";
  return `${ratio.toFixed(2)}:1`;
}

export function meetsAAA(ratio: number | null): boolean {
  return ratio !== null && ratio >= 7;
}

export function meetsAA(ratio: number | null): boolean {
  return ratio !== null && ratio >= 4.5;
}
