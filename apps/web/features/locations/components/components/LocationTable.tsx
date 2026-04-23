"use client";

import { format } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  Warehouse,
  Store,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type SortOrder } from "@/components/ui/table";
import type { Location } from "../../hooks/use-locations";

interface LocationTableProps {
  locations: Location[];
  isLoading?: boolean;
  canManage: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (sortBy: string, sortOrder: SortOrder) => void;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onRestore?: (location: Location) => void;
  selectedLocations?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function LocationTable({
  locations,
  isLoading,
  canManage,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onRestore,
  selectedLocations = new Set(),
  onSelectionChange,
  hasActiveFilters,
  onClearFilters,
}: LocationTableProps) {
  const columns: DataTableColumn<Location>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cellClassName: "font-medium",
      cell: (l) => (
        <div className="flex items-center gap-2">
          {l.type === "WAREHOUSE" ? (
            <Warehouse
              className="h-4 w-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Store
              className="h-4 w-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          )}
          {l.name}
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      sortKey: "type",
      cell: (l) => (
        <Badge variant={l.type === "WAREHOUSE" ? "default" : "secondary"}>
          {l.type}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      sortKey: "createdAt",
      cellClassName: "text-muted-foreground text-sm whitespace-nowrap",
      cell: (l) => format(new Date(l.createdAt), "MMM d, yyyy"),
    },
    {
      id: "isDefaultWarehouse",
      header: "Default warehouse",
      cell: (l) =>
        l.type === "WAREHOUSE" && l.isDefaultWarehouse ? "Yes" : "-",
    },
    {
      id: "address",
      header: "Address",
      cellClassName: "max-w-[200px] truncate text-muted-foreground",
      cell: (l) => l.address || "-",
    },
    {
      id: "status",
      header: "Status",
      cell: (l) => (
        <Badge variant={l.isActive ? "default" : "destructive"}>
          {l.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "inventory",
      header: "Inventory Items",
      cell: (l) => l._count?.inventory || 0,
    },
  ];

  return (
    <DataTable<Location>
      data={locations}
      columns={columns}
      getRowKey={(l) => l.id}
      isLoading={isLoading}
      skeletonRows={3}
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
        canManage && onSelectionChange
          ? {
              selectedIds: selectedLocations,
              onChange: onSelectionChange,
              getRowId: (l) => l.id,
            }
          : undefined
      }
      emptyState={{
        title: hasActiveFilters
          ? "No locations match your filters"
          : "No locations yet",
        description: hasActiveFilters
          ? "Try adjusting your search or filters."
          : "Get started by creating a warehouse or showroom.",
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
      renderMobileCard={(location) => (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex gap-3">
            {canManage && onSelectionChange && (
              <div className="shrink-0 pt-0.5">
                <Checkbox
                  checked={selectedLocations.has(location.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(selectedLocations);
                    if (checked === true) next.add(location.id);
                    else next.delete(location.id);
                    onSelectionChange(next);
                  }}
                  aria-label={`Select ${location.name}`}
                />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {location.type === "WAREHOUSE" ? (
                    <Warehouse
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Store
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-semibold leading-snug">
                    {location.name}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label={`Actions for ${location.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManage ? (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(location)}>
                          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        {location.isActive ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(location)}
                          >
                            <Trash2
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          onRestore && (
                            <DropdownMenuItem
                              onClick={() => onRestore(location)}
                            >
                              <RotateCcw
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Reactivate
                            </DropdownMenuItem>
                          )
                        )}
                      </>
                    ) : (
                      <>
                        <DropdownMenuLabel className="text-muted-foreground font-normal">
                          Only Super Admins can edit or deactivate locations.
                        </DropdownMenuLabel>
                        <DropdownMenuItem disabled>
                          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                          {location.isActive ? "Deactivate" : "Delete"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    location.type === "WAREHOUSE" ? "default" : "secondary"
                  }
                >
                  {location.type}
                </Badge>
                <Badge variant={location.isActive ? "default" : "destructive"}>
                  {location.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {location.address ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {location.address}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                  <p className="font-medium text-foreground/80">Created</p>
                  <p className="tabular-nums">
                    {format(new Date(location.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground/80">Default</p>
                  <p>
                    {location.type === "WAREHOUSE" &&
                    location.isDefaultWarehouse
                      ? "Yes"
                      : "—"}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="font-medium text-foreground/80">Inventory</p>
                  <p>{location._count?.inventory ?? 0} items</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      mobileBreakpoint="md"
      actions={(location) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${location.name}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManage ? (
              <>
                <DropdownMenuItem onClick={() => onEdit(location)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                {location.isActive ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(location)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  onRestore && (
                    <DropdownMenuItem onClick={() => onRestore(location)}>
                      <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                      Reactivate
                    </DropdownMenuItem>
                  )
                )}
              </>
            ) : (
              <>
                <DropdownMenuLabel className="text-muted-foreground font-normal">
                  Only Super Admins can edit or deactivate locations.
                </DropdownMenuLabel>
                <DropdownMenuItem disabled>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem disabled variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {location.isActive ? "Deactivate" : "Delete"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
