/**
 * Visual indicator for a drop zone (top/bottom/left/right/inside).
 * Renders as a colored line or highlight region.
 */

import React from "react";
import type { DropZone } from "./PreviewMessageBus";

interface DropIndicatorProps {
  zone: DropZone;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
}

export const DropIndicator = React.forwardRef<
  HTMLDivElement,
  DropIndicatorProps
>(({ zone, rect, isVisible }, ref) => {
  if (!isVisible) return null;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    zIndex: 1000,
  };

  const zoneStyles: Record<DropZone, () => React.CSSProperties> = {
    top: () => ({
      ...baseStyle,
      top: rect.y - 2,
      left: rect.x,
      width: rect.width,
      height: 4,
      backgroundColor: "#3b82f6",
    }),
    bottom: () => ({
      ...baseStyle,
      top: rect.y + rect.height - 2,
      left: rect.x,
      width: rect.width,
      height: 4,
      backgroundColor: "#3b82f6",
    }),
    left: () => ({
      ...baseStyle,
      top: rect.y,
      left: rect.x - 2,
      width: 4,
      height: rect.height,
      backgroundColor: "#3b82f6",
    }),
    right: () => ({
      ...baseStyle,
      top: rect.y,
      left: rect.x + rect.width - 2,
      width: 4,
      height: rect.height,
      backgroundColor: "#3b82f6",
    }),
    inside: () => ({
      ...baseStyle,
      top: rect.y,
      left: rect.x,
      width: rect.width,
      height: rect.height,
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      border: "2px dashed #3b82f6",
      boxSizing: "border-box",
    }),
  };

  return <div ref={ref} style={zoneStyles[zone]()} />;
});

DropIndicator.displayName = "DropIndicator";
