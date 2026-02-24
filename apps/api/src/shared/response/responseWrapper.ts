import { Response } from "express";
import type { PaginationResult } from "@/utils/pagination";

/**
 * Send a success response.
 */
export function ok<T>(
  res: Response,
  data?: T,
  status: number = 200,
  message?: string,
): Response {
  const body: { success: boolean; data?: T; message?: string } = {
    success: true,
  };
  if (data !== undefined) body.data = data;
  if (message) body.message = message;
  return res.status(status).json(body);
}

/**
 * Send a paginated success response.
 */
export function okPaginated<T>(
  res: Response,
  items: T[],
  pagination: PaginationResult<T>["pagination"],
  message?: string,
): Response {
  const body: {
    success: boolean;
    data: { items: T[]; pagination: PaginationResult<T>["pagination"] };
    message?: string;
  } = {
    success: true,
    data: { items, pagination },
  };
  if (message) body.message = message;
  return res.status(200).json(body);
}

/**
 * Send an error response. Optional extra data (e.g. summary, created, skipped, errors) for bulk operations.
 */
export function fail(
  res: Response,
  error: string,
  status: number = 400,
  code?: string,
  extra?: Record<string, unknown>,
): Response {
  const body: {
    success: boolean;
    error: string;
    code?: string;
    [k: string]: unknown;
  } = { success: false, error };
  if (code) body.code = code;
  if (extra && Object.keys(extra).length > 0) Object.assign(body, extra);
  return res.status(status).json(body);
}
