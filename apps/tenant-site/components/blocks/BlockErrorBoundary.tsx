"use client";

import { Component, type ReactNode } from "react";

export class BlockErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--color-muted)",
          }}
        >
          <p>This section couldn&apos;t be loaded.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
