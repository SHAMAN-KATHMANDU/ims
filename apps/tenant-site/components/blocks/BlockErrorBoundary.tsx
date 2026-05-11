"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface BlockErrorBoundaryProps {
  children: ReactNode;
  /**
   * Block kind being rendered — surfaced in dev so the developer knows
   * which block crashed without digging through the React tree.
   */
  blockKind?: string;
}

interface BlockErrorBoundaryState {
  error: Error | null;
}

/**
 * Per-block error boundary.
 *
 * React class boundaries already catch errors from synchronous render,
 * lifecycle methods, AND from Suspense-bounded async children (when an
 * async server component's promise rejects, React unwinds to the
 * nearest boundary). The fallback here used to say "couldn't be loaded"
 * with no context — so a single bad block looked indistinguishable from
 * a network blip and gave no clue to the developer or the editor.
 *
 * Now: production renders a small muted placeholder; dev renders the
 * placeholder PLUS the block kind + error message so the source of the
 * crash is obvious in the canvas.
 */
export class BlockErrorBoundary extends Component<
  BlockErrorBoundaryProps,
  BlockErrorBoundaryState
> {
  state: BlockErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BlockErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log so editor users + devs can see which block + which file path
    // the throw came from. Never leaked to the rendered DOM in prod.
    // eslint-disable-next-line no-console
    console.error(
      `[BlockErrorBoundary] ${this.props.blockKind ?? "unknown"} block crashed:`,
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const isDev = process.env.NODE_ENV !== "production";
    return (
      <div
        role="alert"
        style={{
          padding: "1.25rem",
          margin: "0.5rem 0",
          textAlign: "center",
          color: "var(--color-muted)",
          background: isDev
            ? "rgba(220, 38, 38, 0.04)"
            : "var(--color-surface)",
          border: isDev ? "1px dashed rgba(220, 38, 38, 0.5)" : "none",
          borderRadius: "var(--radius)",
          fontSize: "0.875rem",
        }}
      >
        {isDev ? (
          <>
            <strong style={{ color: "rgb(185, 28, 28)" }}>Block error</strong>
            {this.props.blockKind && <> · {this.props.blockKind}</>}
            <div style={{ marginTop: 4, fontSize: "0.75rem" }}>
              {this.state.error.message}
            </div>
          </>
        ) : (
          <span>This section couldn&apos;t be loaded.</span>
        )}
      </div>
    );
  }
}
