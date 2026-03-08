"use client";

/**
 * React Query wrappers for locations. Business logic and API calls live in locationService; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAuthStore,
  selectIsAuthenticated,
  selectUserRole,
} from "@/store/auth-store";
import {
  getLocations,
  getActiveLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  type Location,
  type LocationListParams,
  type PaginatedLocationsResponse,
  type CreateLocationData,
  type UpdateLocationData,
  type LocationType,
  type LocationStatusFilter,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../services/location.service";

// Re-export types for convenience
export type {
  Location,
  LocationListParams,
  LocationStatusFilter,
  PaginatedLocationsResponse,
  CreateLocationData,
  UpdateLocationData,
  LocationType,
};

// Re-export defaults
export { DEFAULT_PAGE, DEFAULT_LIMIT };

// ============================================
// Query Keys
// ============================================

export const locationKeys = {
  all: ["locations"] as const,
  lists: () => [...locationKeys.all, "list"] as const,
  list: (params: LocationListParams) =>
    [...locationKeys.lists(), params] as const,
  active: () => [...locationKeys.all, "active"] as const,
  details: () => [...locationKeys.all, "detail"] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

// ============================================
// Location Hooks
// ============================================

/**
 * Hook for fetching paginated locations with filtering
 */
export function useLocationsPaginated(params: LocationListParams = {}) {
  const normalizedParams: LocationListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    type: params.type,
    activeOnly: params.activeOnly,
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return useQuery({
    queryKey: locationKeys.list(normalizedParams),
    queryFn: () => getLocations(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching all active locations.
 * Only fetches when authenticated and user is NOT platformAdmin (platform admins
 * have no tenant locations and the API returns 403 for them).
 */
export function useActiveLocations() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const userRole = useAuthStore(selectUserRole);
  return useQuery({
    queryKey: locationKeys.active(),
    queryFn: getActiveLocations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated && userRole !== "platformAdmin",
  });
}

/**
 * Hook for fetching a single location by ID
 */
export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => getLocationById(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a new location
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLocationData) => createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: locationKeys.active() });
      queryClient.refetchQueries({ queryKey: locationKeys.lists() });
      queryClient.refetchQueries({ queryKey: locationKeys.active() });
    },
  });
}

/**
 * Hook for updating a location
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationData }) =>
      updateLocation(id, data),
    onSuccess: (updatedLocation) => {
      queryClient.setQueryData(
        locationKeys.detail(updatedLocation.id),
        updatedLocation,
      );
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: locationKeys.active() });
      queryClient.refetchQueries({ queryKey: locationKeys.lists() });
      queryClient.refetchQueries({ queryKey: locationKeys.active() });
    },
  });
}

/**
 * Hook for deleting (deactivating) a location
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: locationKeys.active() });
      queryClient.refetchQueries({ queryKey: locationKeys.lists() });
      queryClient.refetchQueries({ queryKey: locationKeys.active() });
    },
  });
}
