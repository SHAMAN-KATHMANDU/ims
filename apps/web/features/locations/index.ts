export { LocationsPage } from "./components/index";
export { NewLocationPage } from "./components/NewLocationPage";
export { EditLocationPage } from "./components/EditLocationPage";
export { LocationForm } from "./components/LocationForm";
export {
  useLocationsPaginated,
  useLocation,
  useActiveLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  locationKeys,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "./hooks/use-locations";
export type {
  Location,
  LocationType,
  LocationStatusFilter,
  LocationListParams,
  PaginatedLocationsResponse,
  CreateLocationData,
  UpdateLocationData,
} from "./hooks/use-locations";
export {
  getLocations,
  getActiveLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from "./services/location.service";
