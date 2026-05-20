/**
 * Tests for <WorkspaceSlugGuard> — tenant / URL-slug isolation guard.
 *
 * Regression: issue #486 — mobile users were bounced to "Unauthorized Access"
 * across every admin page (CRM included) because the guard compared the URL
 * slug against the stale persisted `auth-storage` cookie tenant instead of the
 * server-confirmed tenant from `/auth/me`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRouter = vi.hoisted(() => ({ replace: vi.fn() }));
const mockUseAuth = vi.fn();
const mockParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams(),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../layout/loading-page", () => ({
  LoadingPage: () => <div>Loading…</div>,
}));

import { WorkspaceSlugGuard } from "./workspace-slug-guard";

const child = <div>Protected workspace content</div>;

describe("<WorkspaceSlugGuard>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.mockReturnValue({ workspace: "demo" });
  });

  it("renders children when the server tenant matches the URL slug", () => {
    mockUseAuth.mockReturnValue({
      serverTenant: { slug: "demo" },
      isLoading: false,
      isAuthenticated: true,
    });

    render(<WorkspaceSlugGuard>{child}</WorkspaceSlugGuard>);

    expect(screen.getByText("Protected workspace content")).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    mockParams.mockReturnValue({ workspace: "Demo" });
    mockUseAuth.mockReturnValue({
      serverTenant: { slug: "  demo  " },
      isLoading: false,
      isAuthenticated: true,
    });

    render(<WorkspaceSlugGuard>{child}</WorkspaceSlugGuard>);

    expect(screen.getByText("Protected workspace content")).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("redirects to /401 when the server tenant differs from the URL slug", () => {
    mockUseAuth.mockReturnValue({
      serverTenant: { slug: "other-tenant" },
      isLoading: false,
      isAuthenticated: true,
    });

    render(<WorkspaceSlugGuard>{child}</WorkspaceSlugGuard>);

    expect(mockRouter.replace).toHaveBeenCalledWith("/401");
    expect(
      screen.queryByText("Protected workspace content"),
    ).not.toBeInTheDocument();
  });

  it("shows the loading page while auth state is still resolving", () => {
    mockUseAuth.mockReturnValue({
      serverTenant: null,
      isLoading: true,
      isAuthenticated: true,
    });

    render(<WorkspaceSlugGuard>{child}</WorkspaceSlugGuard>);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("fails open when /auth/me has not confirmed a tenant — issue #486 stale-cookie regression", () => {
    // serverTenant is null: the persisted cookie may be stale, but without a
    // server-confirmed tenant the guard must not bounce a legitimate user.
    mockUseAuth.mockReturnValue({
      serverTenant: null,
      isLoading: false,
      isAuthenticated: true,
    });

    render(<WorkspaceSlugGuard>{child}</WorkspaceSlugGuard>);

    expect(screen.getByText("Protected workspace content")).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when the user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      serverTenant: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(<WorkspaceSlugGuard>{child}</WorkspaceSlugGuard>);

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
