/**
 * Standardized API response format.
 * All endpoints return this structure for consistency.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}
