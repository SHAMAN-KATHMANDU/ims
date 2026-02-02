import { CatalogPage } from "@/views/products/CatalogPage";

/**
 * Catalog page – read-only product catalog for all roles.
 * Under PRODUCTS in sidebar.
 */
export default function Catalog() {
  return <CatalogPage readOnly />;
}
