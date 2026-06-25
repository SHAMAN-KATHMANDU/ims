/**
 * ContactsPage — delete confirmation flow (issue #604)
 *
 * The delete is a two-step confirm: "Continue" reveals a type-the-name step,
 * then "Delete" runs the mutation. Both live on a Radix `AlertDialogAction`,
 * which closes the dialog on click by default — so step 1 used to close the
 * whole dialog before step 2 could appear, and nothing was ever deleted. The
 * fix calls `e.preventDefault()` in the action's onClick. These tests keep the
 * REAL AlertDialog (a mock wouldn't reproduce the auto-close) and assert the
 * flow reaches the mutation.
 */

import type { ReactNode } from "react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const deleteMutate = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "admin" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (v: unknown) => v,
}));

vi.mock("@/features/permissions", () => ({
  Can: ({ children }: { children?: ReactNode }) => <>{children}</>,
  PermissionGate: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/flags", () => ({
  useEnvFeatureFlag: () => false,
  useFeatureFlag: () => false,
  EnvFeature: { CRM_DEALS: "CRM_DEALS" },
}));

const CONTACT = {
  id: "contact-1",
  firstName: "Cathy",
  lastName: "Stone",
  deals: [],
  tasks: [],
};

vi.mock("../../hooks/use-contacts", () => ({
  useContactsPaginated: () => ({
    data: {
      data: [CONTACT],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    },
    isLoading: false,
  }),
  // Returns the contact only when an id is supplied (deleteId / selectedId).
  useContact: (id: string) => ({
    data: id ? { contact: CONTACT } : undefined,
  }),
  useDeleteContact: () => ({ mutate: deleteMutate, isPending: false }),
  useImportContacts: () => ({}),
  useCreateContact: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateContact: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useContactTags: () => ({ data: { tags: [] } }),
  exportContactsCsv: vi.fn(),
}));

vi.mock("../../hooks/use-companies", () => ({
  useCompaniesForSelect: () => ({ data: { companies: [] } }),
}));

vi.mock("../../hooks/use-crm-settings", () => ({
  useCrmSources: () => ({ data: { sources: [] } }),
  useCrmJourneyTypes: () => ({ data: { journeyTypes: [] } }),
}));

// Stub heavy / Radix-based children. ContactTable exposes the delete trigger.
vi.mock("./ContactTable", () => ({
  ContactTable: ({ onDelete }: { onDelete: (id: string) => void }) => (
    <button onClick={() => onDelete("contact-1")}>row-delete</button>
  ),
}));
vi.mock("./ContactDetail", () => ({ ContactDetail: () => null }));
vi.mock("./ContactForm", () => ({ ContactForm: () => null }));
vi.mock("./ContactImportDialog", () => ({ ContactImportDialog: () => null }));
vi.mock("./CompanyCombobox", () => ({ CompanyCombobox: () => null }));
vi.mock("./TagCombobox", () => ({ TagCombobox: () => null }));
vi.mock("@/components/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/data-table-pagination", () => ({
  DataTablePagination: () => null,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

import { ContactsPage } from "./ContactsPage";

describe("ContactsPage delete flow (issue #604)", () => {
  beforeEach(() => {
    deleteMutate.mockClear();
  });

  function openDeleteDialog() {
    render(<ContactsPage />);
    fireEvent.click(screen.getByText("row-delete"));
  }

  it("clicking Continue advances to the type-to-confirm step (dialog stays open)", async () => {
    openDeleteDialog();

    // Step 1
    const continueBtn = await screen.findByRole("button", {
      name: /continue/i,
    });
    expect(continueBtn).toBeInTheDocument();

    fireEvent.click(continueBtn);

    // Step 2 must now appear — i.e. the dialog did NOT close on the action click.
    await waitFor(() => expect(screen.getByText(/type/i)).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: /^delete$/i }),
    ).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("typing the name then clicking Delete fires the delete mutation", async () => {
    openDeleteDialog();

    fireEvent.click(await screen.findByRole("button", { name: /continue/i }));
    const nameInput = await screen.findByPlaceholderText(/contact name/i);
    fireEvent.change(nameInput, { target: { value: "Cathy Stone" } });

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await waitFor(() => expect(deleteBtn).not.toBeDisabled());
    fireEvent.click(deleteBtn);

    await waitFor(() =>
      expect(deleteMutate).toHaveBeenCalledWith("contact-1", expect.anything()),
    );
  });
});
