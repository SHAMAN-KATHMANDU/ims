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

/** Single point of change: default pagination page. */
export const DEFAULT_PAGE = 1;

/** Single point of change: default pagination limit. */
export const DEFAULT_LIMIT = 10;
