import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/site/pages",
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ workspace: "workspace" }),
}));

interface MockAuthState {
  tenant: { slug: string; name: string; plan: string } | null;
  user: { username: string; role: string } | null;
}

// Mock auth store
vi.mock("@/store/auth-store", () => ({
  useAuthStore: <T,>(selector: (state: MockAuthState) => T): T => {
    const state: MockAuthState = {
      tenant: { slug: "test-tenant", name: "Test Tenant", plan: "pro" },
      user: { username: "John Doe", role: "admin" },
    };
    return selector(state);
  },
  selectTenant: (state: MockAuthState) => state.tenant,
  selectUser: (state: MockAuthState) => state.user,
}));

// Mock use-theme
vi.mock("../hooks/use-theme", () => ({
  useTheme: () => ({ toggle: vi.fn() }),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sidebar with navigation groups", () => {
    render(<Sidebar />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Commerce")).toBeInTheDocument();
    expect(screen.getByText("Structure")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("does not render Forms item", () => {
    render(<Sidebar />);
    const formsButton = screen.queryByText("Forms");
    expect(formsButton).not.toBeInTheDocument();
  });

  it("renders all expected navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Pages")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("Blocks")).toBeInTheDocument();
    expect(screen.getByText("Snippets")).toBeInTheDocument();
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("Offers")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Domains")).toBeInTheDocument();
    expect(screen.getByText("SEO & Redirects")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("marks Pages as active based on pathname", () => {
    render(<Sidebar />);
    const pagesButton = screen.getByText("Pages").closest("button");
    expect(pagesButton).toHaveStyle({ background: "var(--bg-active)" });
  });

  it("renders tenant info in workspace switcher", () => {
    render(<Sidebar />);
    expect(screen.getByText("Test Tenant")).toBeInTheDocument();
    expect(screen.getByText(/test-tenant/)).toBeInTheDocument();
  });

  it("renders user info in footer", () => {
    render(<Sidebar />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders search button that triggers open-cmdk event", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<Sidebar />);
    const searchButton = screen.getByText("Search & jump…").closest("button");
    act(() => {
      searchButton?.click();
    });
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "open-cmdk" }),
    );
    dispatchSpy.mockRestore();
  });
});
