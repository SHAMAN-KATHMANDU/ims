/**
 * CanvasBlockBoundary: a single throwing block must not unmount the editor.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasBlockBoundary } from "../canvas/CanvasBlockBoundary";

function Bomb(): never {
  throw new Error("kaboom from block");
}

describe("CanvasBlockBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <CanvasBlockBoundary blockKind="heading">
        <div>fine content</div>
      </CanvasBlockBoundary>,
    );
    expect(screen.getByText("fine content")).toBeInTheDocument();
  });

  it("catches a throwing block and renders a placeholder instead of crashing", () => {
    // React logs caught boundary errors; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <CanvasBlockBoundary blockKind="product-grid">
          <Bomb />
        </CanvasBlockBoundary>
        <div>rest of the editor</div>
      </div>,
    );
    expect(
      screen.getByText(/product-grid: failed to render/),
    ).toBeInTheDocument();
    expect(screen.getByText(/kaboom from block/)).toBeInTheDocument();
    // Sibling content survives — the crash stayed inside the boundary.
    expect(screen.getByText("rest of the editor")).toBeInTheDocument();
  });

  it("truncates very long error messages in the placeholder", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const LongBomb = (): never => {
      throw new Error("x".repeat(500));
    };
    render(
      <CanvasBlockBoundary blockKind="hero">
        <LongBomb />
      </CanvasBlockBoundary>,
    );
    const placeholder = screen.getByText(/hero: failed to render/);
    expect(placeholder.textContent!.length).toBeLessThan(300);
  });
});
