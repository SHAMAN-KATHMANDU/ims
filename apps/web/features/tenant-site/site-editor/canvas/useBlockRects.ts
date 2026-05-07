/**
 * Track DOM rects of all blocks in the preview iframe.
 * Uses ResizeObserver + postMessage to keep rects updated.
 */

import { useEffect, useRef, useState } from "react";
import { listenForPreviewMessages } from "./PreviewMessageBus";

export interface BlockRectEntry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useBlockRects() {
  const [rects, setRects] = useState<Map<string, BlockRectEntry>>(new Map());
  const rectsRef = useRef<Map<string, BlockRectEntry>>(new Map());

  useEffect(() => {
    const unsubscribe = listenForPreviewMessages((message) => {
      if (message.type === "rects") {
        const newRects = new Map<string, BlockRectEntry>();
        message.entries.forEach((entry) => {
          newRects.set(entry.id, entry);
        });
        rectsRef.current = newRects;
        setRects(newRects);
      }
    });

    return unsubscribe;
  }, []);

  return {
    rects,
    getRect: (id: string) => rectsRef.current.get(id),
    hasRect: (id: string) => rectsRef.current.has(id),
  };
}
