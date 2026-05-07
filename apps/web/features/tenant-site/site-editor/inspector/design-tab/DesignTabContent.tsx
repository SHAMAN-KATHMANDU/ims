"use client";

import type { BlockNode } from "@repo/shared";
import { VisibilityControls } from "./VisibilityControls";
import { SpacingControls } from "./SpacingControls";
import { BackgroundControls } from "./BackgroundControls";
import { BorderRadiusControls } from "./BorderRadiusControls";

interface DesignTabContentProps {
  block: BlockNode;
  blockId: string;
  onUpdateStyle: (blockId: string, style: Record<string, unknown>) => void;
  onUpdateVisibility: (
    blockId: string,
    visibility: Record<string, unknown>,
  ) => void;
}

export function DesignTabContent({
  block,
  blockId,
  onUpdateStyle,
  onUpdateVisibility,
}: DesignTabContentProps) {
  const style =
    ((block as unknown as Record<string, unknown>).style as Record<
      string,
      unknown
    >) || {};
  const visibility =
    ((block as unknown as Record<string, unknown>).visibility as Record<
      string,
      unknown
    >) || {};

  return (
    <div className="space-y-6">
      <VisibilityControls
        visibility={visibility}
        onChange={(vis) => onUpdateVisibility(blockId, vis)}
      />

      <SpacingControls
        style={style}
        onChange={(s) => onUpdateStyle(blockId, s)}
      />

      <BackgroundControls
        style={style}
        onChange={(s) => onUpdateStyle(blockId, s)}
      />

      <BorderRadiusControls
        style={style}
        onChange={(s) => onUpdateStyle(blockId, s)}
      />
    </div>
  );
}
