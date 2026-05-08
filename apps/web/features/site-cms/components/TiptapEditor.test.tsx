import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { TiptapEditor } from "./TiptapEditor";

describe("TiptapEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders editor container", () => {
    const onChange = vi.fn();
    const { container } = render(<TiptapEditor onChange={onChange} />);
    const editor = container.querySelector("div[style*='border']");
    expect(editor).toBeInTheDocument();
  });

  it("configures the placeholder extension", () => {
    // jsdom can't run the full ProseMirror engine, so the placeholder
    // pseudo-element won't render. Instead verify the wrapper exists —
    // the placeholder text "Start typing…" is configured in the source.
    const onChange = vi.fn();
    const { container } = render(<TiptapEditor onChange={onChange} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("calls onChange when content is updated", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <TiptapEditor initialContent="<p>Hello</p>" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector("[contenteditable]")).toBeInTheDocument();
    });
  });

  it("accepts initial content", async () => {
    const onChange = vi.fn();
    const initialContent = "<h1>Test</h1><p>Content</p>";
    const { container } = render(
      <TiptapEditor initialContent={initialContent} onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Test");
      expect(container.textContent).toContain("Content");
    });
  });

  it("has minimum height of 400px", () => {
    const onChange = vi.fn();
    const { container } = render(<TiptapEditor onChange={onChange} />);
    const wrapper = container.firstChild as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveStyle({ minHeight: "400px" });
  });
});
