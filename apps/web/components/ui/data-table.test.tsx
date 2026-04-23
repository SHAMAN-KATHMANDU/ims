import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { DataTable, type DataTableColumn } from "./data-table";

interface Row {
  id: string;
  name: string;
  count: number;
}

const rows: Row[] = [
  { id: "a", name: "Alpha", count: 1 },
  { id: "b", name: "Bravo", count: 2 },
];

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortKey: "name" },
  { id: "count", header: "Count", cell: (r) => String(r.count) },
];

describe("DataTable", () => {
  it("renders data rows", () => {
    render(<DataTable data={rows} columns={columns} getRowKey={(r) => r.id} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Bravo")).toBeInTheDocument();
  });

  it("shows skeleton when isLoading", () => {
    const { container } = render(
      <DataTable
        data={[]}
        columns={columns}
        getRowKey={(r) => r.id}
        isLoading
        skeletonRows={3}
      />,
    );
    // Each skeleton row has N skeleton cells — we assert the count of <tr>s in tbody
    const body = container.querySelector("tbody");
    expect(body?.querySelectorAll("tr").length).toBe(3);
  });

  it("shows empty state when data is empty", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        getRowKey={(r) => r.id}
        emptyState={{
          title: "No items",
          description: "Create your first item.",
        }}
      />,
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Create your first item.")).toBeInTheDocument();
  });

  it("shows error state with retry", () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={columns}
        getRowKey={(r) => r.id}
        error={new Error("API down")}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("API down")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("fires onSort when a sortable header is clicked", () => {
    const onSort = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        sort={{ sortBy: "name", sortOrder: "asc", onSort }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /name/i }));
    expect(onSort).toHaveBeenCalledWith("name", "desc");
  });

  it("fires selection onChange for row + select-all", () => {
    const onChange = vi.fn();
    render(
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        selection={{
          selectedIds: new Set(),
          onChange,
          getRowId: (r) => r.id,
        }}
      />,
    );
    // Check row "a"
    fireEvent.click(screen.getByRole("checkbox", { name: /select row a/i }));
    expect(onChange).toHaveBeenCalledWith(new Set(["a"]));

    // Select all
    onChange.mockClear();
    fireEvent.click(screen.getByRole("checkbox", { name: /select all rows/i }));
    expect(onChange).toHaveBeenCalledWith(new Set(["a", "b"]));
  });

  it("renders actions column when provided", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        actions={(r) => <button type="button">Edit {r.name}</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Edit Alpha" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Bravo" }),
    ).toBeInTheDocument();
  });

  it("uses renderMobileCard for mobile pane", () => {
    const { container } = render(
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        renderMobileCard={(r) => <div data-testid="mobile-card">{r.name}</div>}
      />,
    );
    expect(
      container.querySelectorAll('[data-testid="mobile-card"]').length,
    ).toBe(2);
  });
});
