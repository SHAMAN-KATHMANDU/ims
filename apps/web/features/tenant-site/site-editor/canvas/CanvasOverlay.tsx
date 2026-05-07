/**
 * Overlay for block selection, hover handles, drop zones, and selection toolbar.
 * Floats above the canvas iframe.
 */

import React, { useState, useEffect } from "react";
import { useEditorStore } from "../store/editor-store";
import {
  selectHoveredBlockId,
  selectSelectedId,
  selectSetHoveredBlockId,
} from "../store/selectors";
import { useBlockRects } from "./useBlockRects";
import { BlockHoverHandle } from "./BlockHoverHandle";
import { DropIndicator } from "./DropIndicator";
import { BlockSelectionToolbar } from "./BlockSelectionToolbar";
import { listenForPreviewMessages } from "./PreviewMessageBus";
import type { DropZone } from "./PreviewMessageBus";

interface CanvasOverlayProps {
  iframeWindow?: Window;
}

export const CanvasOverlay = React.forwardRef<
  HTMLDivElement,
  CanvasOverlayProps
>(({ iframeWindow: _iframeWindow }, ref) => {
  const hoveredId = useEditorStore(selectHoveredBlockId);
  const selectedId = useEditorStore(selectSelectedId);
  const setHoveredId = useEditorStore(selectSetHoveredBlockId);

  const { getRect } = useBlockRects();
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenForPreviewMessages((msg) => {
      if (msg.type === "pointer") {
        const target = msg.target;
        setHoveredId(target || null);
      } else if (msg.type === "dragover") {
        setDropTarget(msg.target);
        setDropZone(msg.zone || null);
      } else if (msg.type === "drop") {
        setDropZone(null);
        setDropTarget(null);
      }
    });

    return unsubscribe;
  }, [setHoveredId]);

  const hoverRect = hoveredId ? getRect(hoveredId) : null;
  const selectedRect = selectedId ? getRect(selectedId) : null;
  const dropRect = dropTarget ? getRect(dropTarget) : null;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 900,
        pointerEvents: "none",
      }}
    >
      {/* Selection ring */}
      {selectedRect && (
        <div
          style={{
            position: "absolute",
            top: selectedRect.y,
            left: selectedRect.x,
            width: selectedRect.width,
            height: selectedRect.height,
            border: "2px solid #3b82f6",
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Hover handle */}
      {hoverRect && hoveredId && (
        <BlockHoverHandle
          id={hoveredId}
          rect={{
            x: hoverRect.x,
            y: hoverRect.y,
            width: hoverRect.width,
            height: hoverRect.height,
          }}
          isVisible={true}
        />
      )}

      {/* Drop indicator */}
      {dropRect && dropZone && (
        <DropIndicator
          zone={dropZone}
          rect={{
            x: dropRect.x,
            y: dropRect.y,
            width: dropRect.width,
            height: dropRect.height,
          }}
          isVisible={true}
        />
      )}

      {/* Selection toolbar */}
      {selectedRect && selectedId && (
        <BlockSelectionToolbar
          id={selectedId}
          rect={{
            x: selectedRect.x,
            y: selectedRect.y,
            width: selectedRect.width,
            height: selectedRect.height,
          }}
        />
      )}
    </div>
  );
});

CanvasOverlay.displayName = "CanvasOverlay";
