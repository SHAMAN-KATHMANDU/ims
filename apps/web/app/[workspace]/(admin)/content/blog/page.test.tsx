/**
 * Regression guard for GitHub issue #478.
 *
 * The admin Content/Blog page used to 404 because the canonical blog list
 * lives at /[workspace]/settings/site/blog. PR #542 introduced a server-
 * component redirect at /[workspace]/content/blog → settings/site/blog so
 * legacy bookmarks (and the URL surfaced by Adhikaryrita on 2026-05-07)
 * keep working. This test pins the redirect target so a future "let's
 * clean up legacy routes" PR fails the build instead of silently
 * resurrecting the Page-Not-Found shell.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((to: string) => {
    // Mirror Next's behavior: throw to short-circuit rendering.
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import ContentBlogRedirect from "./page";
import ContentPagesRedirect from "../pages/page";

afterEach(() => {
  redirectMock.mockClear();
});

describe("legacy /[workspace]/content/* → /settings/site/* redirects", () => {
  it("redirects /demo/content/blog to /demo/settings/site/blog", async () => {
    await expect(
      ContentBlogRedirect({ params: Promise.resolve({ workspace: "demo" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/demo/settings/site/blog");
    expect(redirectMock).toHaveBeenCalledWith("/demo/settings/site/blog");
  });

  it("redirects /demo/content/pages to /demo/settings/site/pages", async () => {
    await expect(
      ContentPagesRedirect({ params: Promise.resolve({ workspace: "demo" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/demo/settings/site/pages");
    expect(redirectMock).toHaveBeenCalledWith("/demo/settings/site/pages");
  });

  it("falls back to /admin when the workspace slug is empty", async () => {
    await expect(
      ContentBlogRedirect({ params: Promise.resolve({ workspace: "" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/settings/site/blog");
    expect(redirectMock).toHaveBeenCalledWith("/admin/settings/site/blog");
  });

  it("trims whitespace before composing the target", async () => {
    await expect(
      ContentBlogRedirect({
        params: Promise.resolve({ workspace: "  ruby  " }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/ruby/settings/site/blog");
    expect(redirectMock).toHaveBeenCalledWith("/ruby/settings/site/blog");
  });
});
