import { CatalogPage } from "@/features/products";

/**
 * Catalog page – read-only product catalog for all roles.
 * Under PRODUCTS in sidebar.
 */
export default function Catalog() {
  return <CatalogPage readOnly />;
}
