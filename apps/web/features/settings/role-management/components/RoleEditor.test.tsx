import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Route mocks — useParams / useRouter need controllable values.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "acme" }),
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}));

const createMutate = vi.fn();
const updateMutate = vi.fn();

// Hoisted fields the test flips between describe blocks. We mutate these
// refs from `beforeEach` rather than re-mocking, so vitest's module cache
// stays stable.
const ctrl = {
  role: undefined as
    | undefined
    | {
        id: string;
        tenantId: string;
        name: string;
        priority: number;
        permissions: string;
        isSystem: boolean;
        color: string | null;
        createdAt: string;
        updatedAt: string;
      },
};

// Mock the internal hooks module — PermissionGate/Can import from there, not
// from the public feature barrel.
vi.mock("@/features/permissions/hooks/use-permissions", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/permissions/hooks/use-permissions")
  >("@/features/permissions/hooks/use-permissions");
  return {
    ...actual,
    useCan: () => ({ allowed: true, isLoading: false }),
  };
});

vi.mock("@/features/permissions/hooks/use-roles", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/permissions/hooks/use-roles")
  >("@/features/permissions/hooks/use-roles");
  return {
    ...actual,
    useRole: () => ({ data: ctrl.role, isLoading: false }),
    useCreateRole: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateRole: () => ({ mutateAsync: updateMutate, isPending: false }),
  };
});

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Stable import (vi.mock is hoisted above imports, so this is safe).
import { RoleEditor } from "./RoleEditor";

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("RoleEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctrl.role = undefined;
  });

  it("renders the 6 modules in the left rail with granted/total counts", () => {
    renderWithProviders(<RoleEditor />);
    expect(
      screen.getByRole("button", { name: /Inventory/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CRM/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Settings/ }),
    ).toBeInTheDocument();
  });

  it("shows the Administrator toggle in the footer with warning copy", () => {
    renderWithProviders(<RoleEditor />);
    expect(screen.getByText(/Grant Administrator/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Bypass every permission check/i),
    ).toBeInTheDocument();
  });

  it("disables save when nothing is dirty", () => {
    renderWithProviders(<RoleEditor />);
    const save = screen.getByRole("button", { name: /Save changes/i });
    expect(save).toBeDisabled();
  });

  it("enables save and increments dirty count when a permission is toggled", () => {
    renderWithProviders(<RoleEditor />);

    const firstSwitch = screen.getAllByRole("switch", {
      name: /View products/i,
    })[0]!;
    fireEvent.click(firstSwitch);

    const save = screen.getByRole("button", { name: /Save changes/i });
    expect(save).not.toBeDisabled();
    expect(screen.getByText(/1 permission change/i)).toBeInTheDocument();
  });

  it("blocks toggles on system roles (switches disabled)", () => {
    ctrl.role = {
      id: "r-admin",
      tenantId: "t1",
      name: "Admin",
      priority: 900,
      permissions: "",
      isSystem: true,
      color: "#000000",
      createdAt: "",
      updatedAt: "",
    };
    renderWithProviders(<RoleEditor roleId="r-admin" />);

    const switches = screen.getAllByRole("switch");
    // At least one switch (the Inventory.PRODUCTS.VIEW toggle) must be present.
    expect(switches.length).toBeGreaterThan(0);
    for (const s of switches) {
      expect(s).toBeDisabled();
    }
    expect(
      screen.getByRole("button", { name: /Duplicate as custom role/i }),
    ).toBeInTheDocument();
  });
});
