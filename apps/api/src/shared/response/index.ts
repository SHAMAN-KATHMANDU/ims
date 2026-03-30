import { Response } from "express";

export type ApiSuccessResponse<T> = { success: true; data: T };
export type ApiErrorResponse = { success: false; message: string };
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function ok<T>(res: Response, data: T, statusCode = 200): Response {
  return res
    .status(statusCode)
    .json({ success: true, data } satisfies ApiSuccessResponse<T>);
}

export function fail(
  res: Response,
  message: string,
  statusCode = 400,
): Response {
  return res
    .status(statusCode)
    .json({ success: false, message } satisfies ApiErrorResponse);
}
