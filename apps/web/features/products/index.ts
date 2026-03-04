export * from "./hooks/use-products";
export * from "./hooks/use-attribute-types";
export {
  getProductDiscounts,
  downloadProducts,
  downloadBulkUploadTemplate,
  type CreateProductData,
} from "./services/product.service";

export { ProductPage } from "./components/index";
export { ProductEditPage } from "./components/ProductEditPage";
export { ProductNewPage } from "./components/ProductNewPage";
export { CategoriesPage } from "./components/CategoriesPage";
export { CatalogPage } from "./components/CatalogPage";
export { DiscountsPage } from "./components/DiscountsPage";
export { AttributeTypesPage } from "./components/AttributeTypesPage";
export { ProductBulkUploadPage } from "./components/ProductBulkUploadPage";
