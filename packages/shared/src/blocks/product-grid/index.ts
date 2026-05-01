/**
 * Product grid block module — schema, catalog, and re-exports.
 */

export {
  type ProductGridProps,
  ProductGridSchema,
  type ProductGridInput,
} from "./schema";
export {
  productGridCatalog,
  productGridNewArrivalsCatalog,
  productGridHotDealsCatalog,
  productGridStaffPicksCatalog,
  productGridTrendingCatalog,
} from "./catalog";
