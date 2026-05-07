/**
 * Right dock: inspector panel.
 * Tabs: Content, Design, Advanced.
 */

import React from "react";
import { BlockInspector } from "../inspector/BlockInspector";

interface RightDockProps {
  selectedBlockId: string | null;
  onClose: () => void;
}

export const RightDock = React.forwardRef<HTMLDivElement, RightDockProps>(
  ({ selectedBlockId, onClose: _onClose }, ref) => {
    if (!selectedBlockId) {
      return (
        <div
          ref={ref}
          className="w-80 border-l border-border bg-background flex flex-col items-center justify-center p-4"
        >
          <div className="text-center text-muted-foreground">
            <div className="text-sm">Select a block to inspect</div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="w-80 border-l border-border bg-background flex flex-col"
      >
        <BlockInspector />
      </div>
    );
  },
);

RightDock.displayName = "RightDock";
