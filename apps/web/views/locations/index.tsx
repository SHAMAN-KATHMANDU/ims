"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectIsSuperAdmin } from "@/stores/auth-store";
import {
  useLocationsPaginated,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  type Location,
  type LocationType,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/hooks/useLocation";
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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function LocationsPage() {
  const { toast } = useToast();
  const isSuperAdmin = useAuthStore(selectIsSuperAdmin);

  // Pagination state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [search, setSearch] = useState("");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(
    null,
  );

  // Data fetching
  const { data: locationsResponse, isLoading } = useLocationsPaginated({
    page,
    limit: DEFAULT_LIMIT,
    search,
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

  const handleEdit = (location: Location) => {
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
        error instanceof Error ? error.message : "Failed to delete location";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        {isSuperAdmin && (
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
        )}
      </div>

      <LocationTable
        locations={locations}
        isLoading={isLoading}
        canManage={isSuperAdmin}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLocationMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
