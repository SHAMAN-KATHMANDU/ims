/**
 * Single source for API-related types and pagination constants.
 * Do not define PaginationMeta or DEFAULT_PAGE/LIMIT in services.
 */

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** API success body: ok() sends { success, data: payload }. Use for typing api.get/post/put response.data. */
export interface ApiWrapped<T> {
  data?: T;
}

/** Default pagination meta for fallbacks when API does not return pagination. */
export const DEFAULT_PAGINATION_META: PaginationMeta = {
  currentPage: 1,
  totalPages: 0,
  totalItems: 0,
  itemsPerPage: 10,
  hasNextPage: false,
  hasPrevPage: false,
};

/** Single point of change: default pagination page. */
export const DEFAULT_PAGE = 1;

/** Single point of change: default pagination limit. */
export const DEFAULT_LIMIT = 10;
