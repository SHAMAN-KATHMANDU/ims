"use client";

import { format } from "date-fns";
import { Edit2, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";
import { useCallback } from "react";

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
  const renderMobileCard = useCallback(
    (c: Category) => (
      <div className="rounded-md border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm min-w-0 break-words">{c.name}</p>
          <div className="shrink-0">
            {c.deletedAt ? (
              <Badge variant="secondary">Deactivated</Badge>
            ) : (
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            )}
          </div>
        </div>

        {c.description && (
          <p className="text-sm text-muted-foreground min-w-0 break-words">
            {c.description}
          </p>
        )}

        {subcategoriesByCategory[c.id] &&
          subcategoriesByCategory[c.id]!.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Subcategories
              </p>
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
            </div>
          )}

        <div>
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="text-sm font-medium">
            {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—"}
          </p>
        </div>

        {canManageProducts && (
          <div className="flex gap-1 pt-1">
            {c.deletedAt ? (
              onRestore && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => onRestore(c)}
                  disabled={isRestoring}
                >
                  Restore
                </Button>
              )
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => onEdit(c)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1 text-destructive hover:text-destructive"
                  onClick={() => onDelete(c)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    ),
    [
      canManageProducts,
      subcategoriesByCategory,
      onEdit,
      onDelete,
      onRestore,
      isRestoring,
    ],
  );

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
          renderMobileCard={renderMobileCard}
          mobileBreakpoint="md"
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
