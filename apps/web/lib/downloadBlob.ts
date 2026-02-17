/**
 * Single place for triggering browser download from API blob responses.
 * Do not duplicate createObjectURL/link.click logic in services.
 */

import type { AxiosResponse } from "axios";

/**
 * Triggers a browser download from a Blob (e.g. from service that returns Blob directly).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download from an axios blob response (legacy).
 * Reads Content-Disposition for filename when present, otherwise uses defaultFilename.
 */
export function downloadBlobFromResponse(
  response: AxiosResponse<Blob>,
  defaultFilename: string,
): void {
  const contentDisposition = response.headers["content-disposition"];
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/i);
    if (match?.[1]) {
      filename = match[1];
    }
  }
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
