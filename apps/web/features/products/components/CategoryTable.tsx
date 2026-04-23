"use client";

import { format } from "date-fns";
import { Edit2, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { Category } from "@/features/products";

interface CategoryTableProps {
  categories: Category[];
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  canManageProducts: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onRestore?: (category: Category) => void;
  isRestoring?: boolean;
  subcategoriesByCategory?: Record<string, string[]>;
  totalItems?: number;
  selectedCategories?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  highlightCategoryId?: string | null;
}

export function CategoryTable({
  categories,
  sortBy = "",
  sortOrder = "none",
  onSort,
  canManageProducts,
  onEdit,
  onDelete,
  onRestore,
  isRestoring = false,
  subcategoriesByCategory = {},
  totalItems,
  selectedCategories = new Set(),
  onSelectionChange,
  highlightCategoryId,
}: CategoryTableProps) {
  const columns: DataTableColumn<Category>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cellClassName: "font-medium",
      cell: (c) => c.name,
    },
    {
      id: "description",
      header: "Description",
      cellClassName: "text-muted-foreground",
      cell: (c) => c.description || "-",
    },
    {
      id: "subcategories",
      header: "Subcategories",
      cellClassName: "text-muted-foreground",
      cell: (c) =>
        subcategoriesByCategory[c.id] &&
        subcategoriesByCategory[c.id]!.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {subcategoriesByCategory[c.id]!.map((sub) => (
              <span
                key={sub}
                className="px-2 py-0.5 rounded-full bg-muted text-xs"
              >
                {sub}
              </span>
            ))}
          </div>
        ) : (
          <span>-</span>
        ),
    },
    {
      id: "createdAt",
      header: "Created",
      sortKey: "createdAt",
      cellClassName: "text-muted-foreground text-sm whitespace-nowrap",
      cell: (c) =>
        c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—",
    },
    {
      id: "status",
      header: "Status",
      cell: (c) =>
        c.deletedAt ? (
          <Badge variant="secondary">Deactivated</Badge>
        ) : (
          <Badge variant="default" className="bg-green-600">
            Active
          </Badge>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Categories</CardTitle>
        <CardDescription>
          Total: {totalItems ?? categories.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<Category>
          data={categories}
          columns={columns}
          getRowKey={(c) => c.id}
          sort={onSort ? { sortBy, sortOrder, onSort } : undefined}
          selection={
            onSelectionChange
              ? {
                  selectedIds: selectedCategories,
                  onChange: onSelectionChange,
                  getRowId: (c) => c.id,
                }
              : undefined
          }
          rowClassName={(c) =>
            highlightCategoryId === c.id
              ? "bg-amber-100 dark:bg-amber-950/50 animate-pulse"
              : undefined
          }
          actions={
            canManageProducts
              ? (c) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Actions for {c.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {c.deletedAt ? (
                        onRestore && (
                          <DropdownMenuItem
                            onClick={() => onRestore(c)}
                            disabled={isRestoring}
                          >
                            <RotateCcw
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Restore
                          </DropdownMenuItem>
                        )
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(c)}>
                            <Edit2
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(c)}
                          >
                            <Trash2
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
