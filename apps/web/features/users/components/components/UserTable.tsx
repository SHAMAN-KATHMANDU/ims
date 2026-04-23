"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { type SortOrder } from "@/components/ui/table";
import { Edit2, Trash2 } from "lucide-react";
import { type User } from "../../hooks/use-users";

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  selectedUsers?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function UserTable({
  users,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  selectedUsers,
  onSelectionChange,
  hasActiveFilters,
  onClearFilters,
}: UserTableProps) {
  const columns: DataTableColumn<User>[] = [
    {
      id: "username",
      header: "Username",
      sortKey: "username",
      cellClassName: "font-medium",
      cell: (u) => u.username,
    },
    {
      id: "role",
      header: "Role",
      cell: (u) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          {u.role}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created At",
      sortKey: "createdAt",
      cell: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable<User>
      data={users}
      columns={columns}
      getRowKey={(u) => u.id}
      isLoading={isLoading}
      skeletonRows={5}
      sort={
        onSort
          ? {
              sortBy: sortBy ?? "",
              sortOrder: (sortOrder ?? "none") as SortOrder,
              onSort: onSort as (sortBy: string, sortOrder: SortOrder) => void,
            }
          : undefined
      }
      selection={
        onSelectionChange
          ? {
              selectedIds: selectedUsers ?? new Set(),
              onChange: onSelectionChange,
              getRowId: (u) => u.id,
            }
          : undefined
      }
      emptyState={{
        title: hasActiveFilters
          ? "No users match your filters"
          : "No users yet",
        description: hasActiveFilters
          ? "Try a different search or role."
          : undefined,
        action:
          hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
            >
              Clear filters
            </Button>
          ) : undefined,
      }}
      actions={(u) => (
        <div className="inline-flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(u)}
            aria-label={`Edit ${u.username}`}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(u)}
            aria-label={`Delete ${u.username}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          </Button>
        </div>
      )}
    />
  );
}
