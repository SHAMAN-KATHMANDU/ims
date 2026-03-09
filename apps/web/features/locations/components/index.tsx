"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import {
  useLocationsPaginated,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  type Location,
  type LocationType,
  type LocationStatusFilter,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../hooks/use-locations";
import { useIsMobile } from "@/hooks/useMobile";
import { useDebounce } from "@/hooks/useDebounce";
import { LocationForm } from "./components/LocationForm";
import { LocationTable } from "./components/LocationTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOrder } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Label } from "@/components/ui/label";

export function LocationsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const canManageLocations = useAuthStore(selectIsAdmin);
  const isMobile = useIsMobile();

  // Pagination and filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<LocationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LocationStatusFilter>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(
    null,
  );

  // Data fetching — refetch on this page when dialog closes
  const {
    data: locationsResponse,
    isLoading,
    refetch: refetchLocations,
  } = useLocationsPaginated({
    page,
    limit: DEFAULT_LIMIT,
    search: debouncedSearch,
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const locations = locationsResponse?.data ?? [];

  // Mutations
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  const deleteLocationMutation = useDeleteLocation();

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value as LocationType | "all");
    setPage(DEFAULT_PAGE);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value as LocationStatusFilter);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleSort = useCallback(
    (newSortBy: string, newSortOrder: SortOrder) => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleEdit = (location: Location) => {
    if (isMobile) {
      router.push(`${basePath}/locations/${location.id}/edit`);
      return;
    }
    setEditingLocation(location);
    setFormOpen(true);
  };

  const handleReset = () => {
    setEditingLocation(null);
  };

  const handleSubmit = async (data: {
    name: string;
    type: LocationType;
    address: string;
    isDefaultWarehouse?: boolean;
  }) => {
    try {
      if (editingLocation) {
        await updateLocationMutation.mutateAsync({
          id: editingLocation.id,
          data: {
            name: data.name,
            type: data.type,
            address: data.address || undefined,
            isDefaultWarehouse: data.isDefaultWarehouse ?? false,
          },
        });
        toast({ title: "Location updated successfully" });
      } else {
        await createLocationMutation.mutateAsync({
          name: data.name,
          type: data.type,
          address: data.address || undefined,
          isDefaultWarehouse: data.isDefaultWarehouse,
        });
        toast({ title: "Location created successfully" });
      }
      setFormOpen(false);
      setEditingLocation(null);
      refetchLocations();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save location";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      await deleteLocationMutation.mutateAsync(locationToDelete.id);
      toast({ title: "Location deactivated successfully" });
      setLocationToDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message === "string"
            ? (error as { response: { data: { message: string } } }).response
                .data.message
            : "Failed to delete location";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setLocationToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Locations</h1>
        <p className="text-muted-foreground mt-2">
          Manage warehouses and showrooms
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="relative max-w-sm">
              <Label htmlFor="locations-search" className="sr-only">
                Search by name or address
              </Label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="locations-search"
                placeholder="Search by name or address..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-2 sm:w-[180px]">
              <Label htmlFor="locations-type">Type</Label>
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger id="locations-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="SHOWROOM">Showroom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:w-[180px]">
              <Label htmlFor="locations-status">Status</Label>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger id="locations-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {canManageLocations &&
            (isMobile ? (
              <Button asChild>
                <Link href={`${basePath}/locations/new`} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Location
                </Link>
              </Button>
            ) : (
              <LocationForm
                open={formOpen}
                onOpenChange={setFormOpen}
                editingLocation={editingLocation}
                onSubmit={handleSubmit}
                onReset={handleReset}
                isLoading={
                  createLocationMutation.isPending ||
                  updateLocationMutation.isPending
                }
              />
            ))}
        </div>
      </div>

      <LocationTable
        locations={locations}
        isLoading={isLoading}
        canManage={canManageLocations}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={setLocationToDelete}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!locationToDelete}
        onOpenChange={(open) => !open && setLocationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &quot;{locationToDelete?.name}
              &quot;? This location will no longer be available for new
              transfers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteLocationMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
                {deleteLocationMutation.isPending
                  ? "Deactivating..."
                  : "Deactivate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
