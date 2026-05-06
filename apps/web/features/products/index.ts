export * from "./hooks/use-products";
export * from "./hooks/use-attribute-types";
export {
  getProducts,
  getProductDiscounts,
  getProductById,
  getProductByImsCode,
  downloadProducts,
  downloadBulkUploadTemplate,
  bulkUploadDiscounts,
  downloadDiscountBulkTemplate,
  type CreateProductData,
  type Product,
  type DiscountBulkUploadResponse,
  type DiscountBulkCreated,
  type DiscountBulkSkipped,
} from "./services/product.service";

export { ProductPage } from "./components/index";
export { ProductEditPage } from "./components/ProductEditPage";
export { ProductNewPage } from "./components/ProductNewPage";
export { CategoriesPage } from "./components/CategoriesPage";
export { CatalogPage } from "./components/CatalogPage";
export { DiscountsPage } from "./components/DiscountsPage";
export { AttributeTypesPage } from "./components/AttributeTypesPage";
export { ProductTagsPage } from "./components/ProductTagsPage";
export { ProductBulkUploadPage } from "./components/ProductBulkUploadPage";

export {
  useProductSelectionStore,
  selectSelectedProductIds,
  selectSelectionCount,
  selectIsSelected,
  selectClearSelection as selectClearProductSelection,
} from "./store/product-selection-store";

export {
  useCategorySelectionStore,
  selectSelectedCategoryIds,
  selectClearSelection as selectClearCategorySelection,
  selectSetCategories,
} from "./store/category-selection-store";
