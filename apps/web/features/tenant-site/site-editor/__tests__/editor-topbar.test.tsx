/**
 * EditorTopBar: publish button must open the publish modal (it previously
 * had no onClick at all), the device toggle must drive the store, and the
 * title must be humanized (scope name / page title, not the raw UUID).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEditorStore } from "../store/editor-store";
import { EditorTopBar } from "../EditorTopBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../hooks/usePreviewUrl", () => ({
  usePreviewUrl: () => ({ data: "https://preview.example.com/home" }),
}));
vi.mock("../hooks/useSiteLayoutQuery", () => ({
  useSiteLayoutQuery: () => ({ data: { blocks: [], draftBlocks: null } }),
  siteLayoutKeys: { scope: (s: string, p: string | null) => ["l", s, p] },
}));
vi.mock("../../hooks/use-pages", () => ({
  usePageQuery: (id: string) => ({
    data: id ? { id, title: "My Landing Page" } : undefined,
  }),
}));
vi.mock("../hooks/useSiteLayoutMutations", () => ({
  useSaveLayoutDraft: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  usePublishLayout: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

describe("EditorTopBar", () => {
  beforeEach(() => {
    useEditorStore.getState().load([]);
  });

  it("shows the chrome scope name instead of the raw page id", () => {
    render(
      <EditorTopBar workspace="demo" pageId="some-uuid-1234" scope="header" />,
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.queryByText("some-uuid-1234")).not.toBeInTheDocument();
  });

  it("shows the page title for page scope", () => {
    render(
      <EditorTopBar workspace="demo" pageId="some-uuid-1234" scope="page" />,
    );
    expect(screen.getByText("My Landing Page")).toBeInTheDocument();
  });

  it("device toggle drives the editor store", () => {
    render(<EditorTopBar workspace="demo" pageId="p1" scope="home" />);
    fireEvent.click(screen.getByTitle("mobile"));
    expect(useEditorStore.getState().device).toBe("mobile");
    fireEvent.click(screen.getByTitle("tablet"));
    expect(useEditorStore.getState().device).toBe("tablet");
  });

  it("Publish opens the publish modal", () => {
    render(<EditorTopBar workspace="demo" pageId="p1" scope="home" />);
    expect(screen.queryByText("Publish now")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Publish"));
    expect(screen.getByText("Publish now")).toBeInTheDocument();
  });

  it("shows save status derived from the store", () => {
    render(<EditorTopBar workspace="demo" pageId="p1" scope="home" />);
    expect(screen.getByText(/no changes yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Publish")); // no store change
    useEditorStore.getState().setLastSaveTime(Date.now());
  });
});
