/**
 * Global drag layer for block preview during DnD.
 * Shows a ghost image of the dragged block.
 */

import React, { useState, useEffect } from "react";

interface DragLayerProps {
  isDragging: boolean;
  preview?: React.ReactNode;
}

export const DragLayer: React.FC<DragLayerProps> = ({
  isDragging,
  preview,
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setOffset({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDragging]);

  if (!isDragging) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: offset.y,
        left: offset.x,
        zIndex: 2000,
        pointerEvents: "none",
        opacity: 0.7,
      }}
    >
      {preview}
    </div>
  );
};
