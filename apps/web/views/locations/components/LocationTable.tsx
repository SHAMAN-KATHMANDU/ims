"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Warehouse, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Location } from "@/hooks/useLocation";

interface LocationTableProps {
  locations: Location[];
  isLoading?: boolean;
  canManage: boolean;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}

export function LocationTable({
  locations,
  isLoading,
  canManage,
  onEdit,
  onDelete,
}: LocationTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
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
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
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
              <TableCell>
                {location.type === "WAREHOUSE" && location.isDefaultWarehouse
                  ? "Yes"
                  : "-"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {location.address || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={location.isActive ? "default" : "destructive"}>
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
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(location)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {location.isActive ? "Deactivate" : "Delete"}
                        </DropdownMenuItem>
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
                        <DropdownMenuItem disabled className="text-destructive">
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
  );
}
