/**
 * Unwrap `{ success: true, data: T }` from API responses that use ok()/fail().
 */

export type ApiSuccessBody<T> = { success: true; data: T };
export type ApiFailBody = { success: false; message: string };

export function unwrapApiData<T>(axiosData: unknown): T {
  if (
    axiosData &&
    typeof axiosData === "object" &&
    "success" in axiosData &&
    (axiosData as ApiSuccessBody<T>).success === true &&
    "data" in axiosData
  ) {
    return (axiosData as ApiSuccessBody<T>).data;
  }
  if (
    axiosData &&
    typeof axiosData === "object" &&
    (axiosData as ApiFailBody).success === false &&
    typeof (axiosData as ApiFailBody).message === "string"
  ) {
    throw new Error((axiosData as ApiFailBody).message);
  }
  throw new Error("Unexpected API response shape");
}
