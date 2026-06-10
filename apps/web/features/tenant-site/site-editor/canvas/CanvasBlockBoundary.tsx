"use client";

import React from "react";

interface Props {
  blockKind: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Per-block error boundary for the editor canvas. Without it a single block
 * component throwing (bad props, renderer bug) unmounts the WHOLE editor —
 * the user loses the canvas, layers, and inspector in one crash. With it the
 * broken block renders a compact placeholder that can still be selected and
 * deleted via BlockWrap/layers.
 */
export class CanvasBlockBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "12px",
            borderRadius: "4px",
            border: "1px dashed var(--danger)",
            color: "var(--danger)",
            fontSize: "12px",
          }}
        >
          ⚠️ {this.props.blockKind}: failed to render (
          {this.state.error.message.slice(0, 120)}). Select it to edit or delete
          it.
        </div>
      );
    }
    return this.props.children;
  }
}
