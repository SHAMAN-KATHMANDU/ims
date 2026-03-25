"use client";

import { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  Warehouse,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { Location } from "../../hooks/use-locations";

interface LocationTableProps {
  locations: Location[];
  isLoading?: boolean;
  canManage: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onRestore?: (location: Location) => void;
  selectedLocations?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

function LocationMobileCard({
  location,
  canManage,
  onEdit,
  onDelete,
  onRestore,
  showCheckbox,
  selected,
  onSelect,
}: {
  location: Location;
  canManage: boolean;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onRestore?: (location: Location) => void;
  showCheckbox: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        {showCheckbox && (
          <div className="shrink-0 pt-0.5">
            <Checkbox
              checked={selected}
              onCheckedChange={(c) => onSelect(c === true)}
              aria-label={`Select ${location.name}`}
            />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {location.type === "WAREHOUSE" ? (
                <Warehouse className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManage ? (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(location)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {location.isActive ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(location)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      onRestore && (
                        <DropdownMenuItem onClick={() => onRestore(location)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
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
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {location.isActive ? "Deactivate" : "Delete"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={location.type === "WAREHOUSE" ? "default" : "secondary"}
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
                {location.type === "WAREHOUSE" && location.isDefaultWarehouse
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
  );
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
}: LocationTableProps) {
  const canSort = Boolean(onSort);
  const showCheckboxes = canManage && Boolean(onSelectionChange);

  const handleSelectLocation = useCallback(
    (locationId: string, checked: boolean) => {
      if (!onSelectionChange) return;
      const newSelection = new Set(selectedLocations);
      if (checked) {
        newSelection.add(locationId);
      } else {
        newSelection.delete(locationId);
      }
      onSelectionChange(newSelection);
    },
    [selectedLocations, onSelectionChange],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange(new Set(locations.map((l) => l.id)));
      } else {
        onSelectionChange(new Set());
      }
    },
    [locations, onSelectionChange],
  );

  const allSelected =
    locations.length > 0 && locations.every((l) => selectedLocations.has(l.id));

  if (isLoading) {
    return (
      <>
        <div className="space-y-3 md:hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {showCheckboxes && (
                  <TableHead className="w-12">
                    <Checkbox disabled aria-label="Select all locations" />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Default warehouse</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inventory Items</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {showCheckboxes && <TableCell className="w-12" />}
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <Warehouse className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No locations found</h3>
        <p className="text-muted-foreground mt-2">
          Get started by creating a warehouse or showroom.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {locations.map((location) => (
          <LocationMobileCard
            key={location.id}
            location={location}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
            showCheckbox={showCheckboxes}
            selected={selectedLocations.has(location.id)}
            onSelect={(checked) => handleSelectLocation(location.id, checked)}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckboxes && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all locations"
                  />
                </TableHead>
              )}
              {canSort ? (
                <>
                  <SortableTableHead
                    sortKey="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={onSort!}
                  >
                    Name
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="type"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={onSort!}
                  >
                    Type
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="createdAt"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={onSort!}
                  >
                    Created
                  </SortableTableHead>
                </>
              ) : (
                <>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                </>
              )}
              <TableHead>Default warehouse</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inventory Items</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                {showCheckboxes && (
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="w-12"
                  >
                    <Checkbox
                      checked={selectedLocations.has(location.id)}
                      onCheckedChange={(checked) =>
                        handleSelectLocation(location.id, checked === true)
                      }
                      aria-label={`Select ${location.name}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {location.type === "WAREHOUSE" ? (
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Store className="h-4 w-4 text-muted-foreground" />
                    )}
                    {location.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      location.type === "WAREHOUSE" ? "default" : "secondary"
                    }
                  >
                    {location.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {format(new Date(location.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {location.type === "WAREHOUSE" && location.isDefaultWarehouse
                    ? "Yes"
                    : "-"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {location.address || "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={location.isActive ? "default" : "destructive"}
                  >
                    {location.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{location._count?.inventory || 0}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManage ? (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(location)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {location.isActive ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDelete(location)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            onRestore && (
                              <DropdownMenuItem
                                onClick={() => onRestore(location)}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
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
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {location.isActive ? "Deactivate" : "Delete"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
