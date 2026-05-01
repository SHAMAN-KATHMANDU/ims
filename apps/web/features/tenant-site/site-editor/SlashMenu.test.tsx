import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { SlashMenu } from "./SlashMenu";
import { useEditorStore } from "./editor-store";

function makeBlock(id: string, kind = "heading"): BlockNode {
  return {
    id,
    kind: kind as BlockNode["kind"],
    props: {} as BlockNode["props"],
  };
}

beforeEach(() => {
  useEditorStore.getState().load([makeBlock("a"), makeBlock("b")]);
});

afterEach(() => {
  useEditorStore.getState().load([]);
});

function fireSlash(): void {
  const event = new KeyboardEvent("keydown", {
    key: "/",
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

describe("SlashMenu", () => {
  it("does not render until '/' is pressed", () => {
    render(<SlashMenu />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on '/' keypress and shows the search input", () => {
    render(<SlashMenu />);
    act(() => fireSlash());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search blocks/i)).toBeInTheDocument();
  });

  it("filters the list as the user types", () => {
    render(<SlashMenu />);
    act(() => fireSlash());
    const input = screen.getByPlaceholderText(/Search blocks/i);
    fireEvent.change(input, { target: { value: "heading" } });
    // The "heading" entry should be present after filtering.
    expect(
      screen.getByRole("option", { name: /Heading/i }),
    ).toBeInTheDocument();
  });

  it("inserts a new block as a sibling after the selected block on Enter", () => {
    act(() => useEditorStore.getState().setSelected("a"));
    render(<SlashMenu />);
    act(() => fireSlash());

    // Type "heading" so the top option is the heading entry.
    const input = screen.getByPlaceholderText(/Search blocks/i);
    fireEvent.change(input, { target: { value: "heading" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });

    const ids = useEditorStore.getState().present.blocks.map((n) => n.id);
    // A new block is now between "a" and "b".
    expect(ids[0]).toBe("a");
    expect(ids[2]).toBe("b");
    expect(ids).toHaveLength(3);
  });

  it("appends to root when no block is selected", () => {
    act(() => useEditorStore.getState().setSelected(null));
    render(<SlashMenu />);
    act(() => fireSlash());
    const input = screen.getByPlaceholderText(/Search blocks/i);
    fireEvent.change(input, { target: { value: "heading" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });
    const ids = useEditorStore.getState().present.blocks.map((n) => n.id);
    // A new block is now appended at the end.
    expect(ids[0]).toBe("a");
    expect(ids[1]).toBe("b");
    expect(ids).toHaveLength(3);
  });

  it("closes on Escape", () => {
    render(<SlashMenu />);
    act(() => fireSlash());
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores '/' keypress when an INPUT is focused", () => {
    render(<SlashMenu />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent("keydown", {
      key: "/",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    document.body.removeChild(input);
  });
});
