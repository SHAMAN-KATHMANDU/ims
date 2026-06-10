/**
 * PublishModal: must persist the CURRENT draft before promoting (publishing
 * inside the autosave debounce window used to promote a stale server draft),
 * and must stay open when either step fails.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { PublishModal } from "../shell/PublishModal";

const callOrder: string[] = [];
const saveDraftAsync = vi.fn(async () => {
  callOrder.push("save");
  return {};
});
const publishAsync = vi.fn(async () => {
  callOrder.push("publish");
  return {};
});

vi.mock("../hooks/useSiteLayoutMutations", () => ({
  useSaveLayoutDraft: () => ({
    mutateAsync: saveDraftAsync,
    isPending: false,
  }),
  usePublishLayout: () => ({ mutateAsync: publishAsync, isPending: false }),
}));

const draftBlocks = [
  { id: "h1", kind: "heading", props: { text: "Hi" } },
] as BlockNode[];

describe("PublishModal", () => {
  beforeEach(() => {
    callOrder.length = 0;
    saveDraftAsync.mockClear();
    publishAsync.mockClear();
  });

  it("saves the current draft BEFORE publishing, then closes", async () => {
    const onClose = vi.fn();
    const onPublished = vi.fn();
    render(
      <PublishModal
        open
        onClose={onClose}
        scope="home"
        draftBlocks={draftBlocks}
        publishedBlocks={null}
        onPublished={onPublished}
      />,
    );

    fireEvent.click(screen.getByText("Publish now"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(saveDraftAsync).toHaveBeenCalledWith(draftBlocks);
    expect(callOrder).toEqual(["save", "publish"]);
    expect(onPublished).toHaveBeenCalled();
  });

  it("stays open and does not publish when the draft save fails", async () => {
    saveDraftAsync.mockRejectedValueOnce(new Error("save failed"));
    const onClose = vi.fn();
    render(
      <PublishModal
        open
        onClose={onClose}
        scope="home"
        draftBlocks={draftBlocks}
        publishedBlocks={null}
      />,
    );

    fireEvent.click(screen.getByText("Publish now"));

    await waitFor(() => expect(saveDraftAsync).toHaveBeenCalled());
    expect(publishAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the draft-vs-published diff counts", () => {
    render(
      <PublishModal
        open
        onClose={() => {}}
        scope="home"
        draftBlocks={draftBlocks}
        publishedBlocks={[]}
      />,
    );
    // One block in draft, none published → 1 added.
    expect(screen.getByText("Added").nextSibling?.textContent ?? "").toBe("");
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
