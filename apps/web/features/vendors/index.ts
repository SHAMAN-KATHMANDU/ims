export { VendorPage } from "./components/index";
export { NewVendorPage } from "./components/NewVendorPage";
export { EditVendorPage } from "./components/EditVendorPage";
export {
  useVendorsPaginated,
  useVendor,
  useVendorProducts,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  vendorKeys,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "./hooks/use-vendors";
export type {
  Vendor,
  VendorProduct,
  VendorListParams,
  VendorProductsParams,
  PaginatedVendorsResponse,
  PaginatedVendorProductsResponse,
  CreateOrUpdateVendorData,
} from "./hooks/use-vendors";
export {
  getVendors,
  getVendorById,
  getVendorProducts,
  createVendor,
  updateVendor,
  deleteVendor,
} from "./services/vendor.service";
