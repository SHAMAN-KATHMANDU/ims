export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const getPaginationParams = (query: any): Required<PaginationParams> => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const sortBy = query.sortBy || "id";
  const sortOrder = query.sortOrder?.toLowerCase() === "desc" ? "desc" : "asc";
  const search = query.search?.trim() || "";

  return { page, limit, sortBy, sortOrder, search };
};

export const createPaginationResult = <T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
): PaginationResult<T> => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Converts sortBy field name to Prisma orderBy format
 * Handles both camelCase (Prisma model fields) and snake_case (database fields)
 * @param sortBy - Field name to sort by
 * @param sortOrder - 'asc' or 'desc'
 * @param allowedFields - Array of allowed field names for sorting
 * @returns Prisma orderBy object or null if field is not allowed
 */
export const getPrismaOrderBy = (
  sortBy: string,
  sortOrder: "asc" | "desc",
  allowedFields: string[],
): Record<string, "asc" | "desc"> | null => {
  // Check if sortBy is in allowed fields (case-insensitive)
  const normalizedSortBy = sortBy.toLowerCase();
  const allowedField = allowedFields.find(
    (field) => field.toLowerCase() === normalizedSortBy,
  );

  if (!allowedField) {
    return null;
  }

  // Return Prisma orderBy format
  return { [allowedField]: sortOrder };
};
