import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toBase64, empty } from "@/features/permissions";

// PermissionGate's useCan comes from this internal module; mock it there.
vi.mock("@/features/permissions/hooks/use-permissions", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/permissions/hooks/use-permissions")
  >("@/features/permissions/hooks/use-permissions");
  return {
    ...actual,
    useCan: () => ({ allowed: true, isLoading: false }),
  };
});

vi.mock("@/features/permissions/hooks/use-overwrites", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/permissions/hooks/use-overwrites")
  >("@/features/permissions/hooks/use-overwrites");
  return {
    ...actual,
    useOverwrites: () => ({ data: [], isLoading: false }),
    useEffectivePermissions: () => ({
      data: { resourceId: "r1", permissions: toBase64(empty()) },
    }),
    useUpsertOverwrite: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock("@/features/permissions/hooks/use-roles", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/permissions/hooks/use-roles")
  >("@/features/permissions/hooks/use-roles");
  return {
    ...actual,
    useRoles: () => ({
      data: {
        roles: [
          {
            id: "role-1",
            tenantId: "t1",
            name: "Editors",
            priority: 100,
            permissions: toBase64(empty()),
            isSystem: false,
            color: "#6366f1",
            createdAt: "",
            updatedAt: "",
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 100,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
      isLoading: false,
    }),
  };
});

vi.mock("@/features/users", () => ({
  useUsers: () => ({ data: { users: [] }, isLoading: false }),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { ResourceOverwritesPanel } from "./ResourceOverwritesPanel";

function renderWithQueryClient(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ResourceOverwritesPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the subject picker and role option", () => {
    renderWithQueryClient(
      <ResourceOverwritesPanel
        resourceId="r1"
        resourceUpdatePermission="INVENTORY.PRODUCTS.UPDATE"
      />,
    );
    expect(screen.getByRole("tab", { name: "Roles" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Editors")).toBeInTheDocument();
  });

  it("transitions the tri-state control allow → inherit → deny", () => {
    renderWithQueryClient(
      <ResourceOverwritesPanel
        resourceId="r1"
        resourceUpdatePermission="INVENTORY.PRODUCTS.UPDATE"
      />,
    );

    // Select a role to unlock the permission rows
    fireEvent.click(screen.getByText("Editors"));

    // The first permission row should expose three radios.
    const allowRadios = screen.getAllByRole("radio", { name: "Allow" });
    expect(allowRadios.length).toBeGreaterThan(0);

    const firstAllow = allowRadios[0]!;
    fireEvent.click(firstAllow);
    expect(firstAllow).toHaveAttribute("aria-checked", "true");

    const firstInherit = screen.getAllByRole("radio", { name: "Inherit" })[0]!;
    fireEvent.click(firstInherit);
    expect(firstInherit).toHaveAttribute("aria-checked", "true");

    const firstDeny = screen.getAllByRole("radio", { name: "Deny" })[0]!;
    fireEvent.click(firstDeny);
    expect(firstDeny).toHaveAttribute("aria-checked", "true");
  });
});
