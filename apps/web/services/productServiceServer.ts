/**
 * Server-safe Product Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedProductsResponse,
  type ProductListParams,
  type Product,
} from "@/services/productService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedProductsResponse, type ProductListParams };

function buildProductQueryParams(params: ProductListParams): URLSearchParams {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    locationId,
    categoryId,
    subCategoryId,
    subCategory,
    vendorId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    lowStock,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (locationId) queryParams.set("locationId", locationId);
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (subCategoryId) queryParams.set("subCategoryId", subCategoryId);
  if (subCategory) queryParams.set("subCategory", subCategory);
  if (vendorId) queryParams.set("vendorId", vendorId);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  if (lowStock) queryParams.set("lowStock", "1");
  return queryParams;
}

/**
 * Fetch products with pagination. Use in Server Components.
 */
export async function getProductsServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: ProductListParams = {},
): Promise<PaginatedProductsResponse> {
  const queryParams = buildProductQueryParams(params);
  const response = await fetchServer(`/products?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch products (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return {
    data: json.data ?? [],
    pagination: json.pagination,
  };
}

/**
 * Fetch a single product by ID. Use in Server Components.
 */
export async function getProductServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<Product> {
  if (!id?.trim()) {
    throw new Error("Product ID is required");
  }

  const response = await fetchServer(`/products/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch product (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.product;
}
