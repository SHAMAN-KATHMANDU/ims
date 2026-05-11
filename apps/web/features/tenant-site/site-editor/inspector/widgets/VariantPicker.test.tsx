/**
 * Behavioural tests for the VariantPicker.
 *
 * The picker auto-detects whether a block schema declares a `variant`
 * enum and renders the right number of choices. These tests run against
 * real BLOCK_PROPS_SCHEMAS so a future schema edit (adding a 5th nav-bar
 * variant, removing a footer one) is reflected here without manual
 * fixture updates.
 *
 * Uses the React Server Components-free path of @testing-library/react —
 * VariantPicker is "use client", so it renders fine in jsdom.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariantPicker } from "./VariantPicker";

// jsdom required by Testing Library
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => cleanup());

describe("VariantPicker", () => {
  it("renders one button per variant for footer-columns", () => {
    render(
      <VariantPicker
        blockKind="footer-columns"
        value={undefined}
        onChange={() => {}}
      />,
    );
    // Standard, Minimal, Dark, Centered (humanized labels)
    expect(screen.getByRole("radio", { name: "Standard" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Minimal" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Centered" })).toBeDefined();
  });

  it("renders one button per variant for nav-bar", () => {
    render(
      <VariantPicker
        blockKind="nav-bar"
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: "Standard" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Centered" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Split" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Transparent" })).toBeDefined();
  });

  it("marks the active variant aria-checked=true", () => {
    render(
      <VariantPicker
        blockKind="footer-columns"
        value="dark"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("radio", { name: "Standard" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("calls onChange with the variant value when clicked", () => {
    const onChange = vi.fn();
    render(
      <VariantPicker
        blockKind="footer-columns"
        value="standard"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Minimal" }));
    expect(onChange).toHaveBeenCalledWith("minimal");
  });

  it("renders nothing for blocks without a variant enum (e.g. heading)", () => {
    const { container } = render(
      <VariantPicker
        blockKind="heading"
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for unknown block kinds", () => {
    const { container } = render(
      <VariantPicker
        blockKind="not-a-real-kind"
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
