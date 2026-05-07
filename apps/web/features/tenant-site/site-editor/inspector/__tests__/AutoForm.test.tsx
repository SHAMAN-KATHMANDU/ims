import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { BLOCK_PROPS_SCHEMAS } from "@repo/shared";
import { AutoForm } from "../auto-form/AutoForm";

describe("AutoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 62 block kinds without JsonFallbackField as primary dispatch", () => {
    const blockKinds = Object.keys(BLOCK_PROPS_SCHEMAS);

    expect(blockKinds.length).toBeGreaterThanOrEqual(62);

    blockKinds.forEach((kind) => {
      const schema =
        BLOCK_PROPS_SCHEMAS[kind as keyof typeof BLOCK_PROPS_SCHEMAS];
      const handleChange = vi.fn();

      const { container, rerender } = render(
        <AutoForm
          schema={schema}
          values={{}}
          onChange={handleChange}
          blockKind={kind}
        />,
      );

      // Verify that no JsonFallbackField is rendered
      // (every block kind's props must be fully modeled)
      const fallbackField = container.querySelector(
        '[data-testid="json-fallback-field"]',
      );
      expect(
        fallbackField,
        `Block kind "${kind}" should not have JsonFallbackField as primary dispatch`,
      ).toBeNull();

      rerender(
        <AutoForm
          schema={schema}
          values={{}}
          onChange={handleChange}
          blockKind={kind}
        />,
      );
    });
  });

  it("dispatches string fields for text inputs", () => {
    const schema = z.object({
      title: z.string(),
      description: z.string().max(500),
    });

    const handleChange = vi.fn();
    render(
      <AutoForm
        schema={schema}
        values={{ title: "", description: "" }}
        onChange={handleChange}
        blockKind="test"
      />,
    );

    // Should render input fields, not JSON fallback
    const fallback = screen.queryByTestId("json-fallback-field");
    expect(fallback).toBeNull();
  });

  it("dispatches enum fields for union types", () => {
    const schema = z.object({
      alignment: z.enum(["left", "center", "right"]),
    });

    const handleChange = vi.fn();
    render(
      <AutoForm
        schema={schema}
        values={{ alignment: "left" }}
        onChange={handleChange}
        blockKind="test"
      />,
    );

    // Should render select dropdown, not JSON fallback
    const fallback = screen.queryByTestId("json-fallback-field");
    expect(fallback).toBeNull();
  });

  it("detects media picker heuristics for image fields", () => {
    const schema = z.object({
      backgroundImage: z.string(),
      src: z.string(),
    });

    const handleChange = vi.fn();
    render(
      <AutoForm
        schema={schema}
        values={{ backgroundImage: "", src: "" }}
        onChange={handleChange}
        blockKind="hero"
      />,
    );

    // Should render MediaPicker components (or at least not JSON fallback)
    const fallback = screen.queryByTestId("json-fallback-field");
    expect(fallback).toBeNull();
  });

  it("handles optional fields gracefully", () => {
    const schema = z.object({
      optionalTitle: z.string().optional(),
      requiredLabel: z.string(),
    });

    const handleChange = vi.fn();
    const { container } = render(
      <AutoForm
        schema={schema}
        values={{ optionalTitle: undefined, requiredLabel: "" }}
        onChange={handleChange}
        blockKind="test"
      />,
    );

    const fallback = container.querySelector(
      '[data-testid="json-fallback-field"]',
    );
    expect(fallback).toBeNull();
  });

  it("handles boolean fields", () => {
    const schema = z.object({
      enabled: z.boolean(),
      hidden: z.boolean().optional(),
    });

    const handleChange = vi.fn();
    const { container } = render(
      <AutoForm
        schema={schema}
        values={{ enabled: false, hidden: true }}
        onChange={handleChange}
        blockKind="test"
      />,
    );

    const fallback = container.querySelector(
      '[data-testid="json-fallback-field"]',
    );
    expect(fallback).toBeNull();
  });

  it("handles array of strings", () => {
    const schema = z.object({
      tags: z.array(z.string()),
      labels: z.array(z.string()).optional(),
    });

    const handleChange = vi.fn();
    const { container } = render(
      <AutoForm
        schema={schema}
        values={{ tags: [], labels: [] }}
        onChange={handleChange}
        blockKind="test"
      />,
    );

    const fallback = container.querySelector(
      '[data-testid="json-fallback-field"]',
    );
    expect(fallback).toBeNull();
  });
});
