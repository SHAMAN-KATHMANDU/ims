"use client";

import { format } from "date-fns";
import { Eye, Edit } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { type SortOrder } from "@/components/ui/table";
import { type Member } from "../hooks/use-members";

interface MemberTableProps {
  members: Member[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (sortBy: string, sortOrder: SortOrder) => void;
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  // Selection props
  selectedMembers?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function MemberTable({
  members,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  selectedMembers = new Set(),
  onSelectionChange,
  hasActiveFilters,
  onClearFilters,
}: MemberTableProps) {
  const columns: DataTableColumn<Member>[] = [
    {
      id: "phone",
      header: "Phone",
      sortKey: "phone",
      cellClassName: "font-medium",
      cell: (m) => m.phone,
    },
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cell: (m) => m.name || "-",
    },
    {
      id: "email",
      header: "Email",
      cell: (m) => m.email || "-",
    },
    {
      id: "totalSales",
      header: "Total Sales",
      cell: (m) => m._count?.sales ?? 0,
    },
    {
      id: "status",
      header: "Status",
      cell: (m) => (
        <StatusBadge variant={m.isActive ? "success" : "muted"}>
          {m.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      id: "createdAt",
      header: "Joined",
      sortKey: "createdAt",
      cell: (m) => format(new Date(m.createdAt), "MMM d, yyyy"),
    },
  ];

  return (
    <DataTable<Member>
      data={members}
      columns={columns}
      getRowKey={(m) => m.id}
      isLoading={isLoading}
      skeletonRows={5}
      sort={
        onSort
          ? {
              sortBy: sortBy ?? "",
              sortOrder: sortOrder ?? "none",
              onSort,
            }
          : undefined
      }
      selection={
        onSelectionChange
          ? {
              selectedIds: selectedMembers,
              onChange: onSelectionChange,
              getRowId: (m) => m.id,
            }
          : undefined
      }
      emptyState={{
        title: hasActiveFilters
          ? "No members match your filters"
          : "No members yet",
        description: hasActiveFilters
          ? "Try adjusting your search or filters."
          : "Members will appear here once enrolled.",
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
      actions={(m) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onView(m)}
            aria-label={`View ${m.phone}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(m)}
            aria-label={`Edit ${m.phone}`}
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    />
  );
}
