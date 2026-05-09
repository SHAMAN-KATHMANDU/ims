/**
 * Pass-through helper kept for backwards compatibility.
 *
 * Historically this unwrapped `{ success: true, data: T }` from the response
 * body. That logic now lives in the global axios response interceptor in
 * `apps/web/lib/axios.ts`, so by the time a service touches `res.data` the
 * envelope is already gone. New code should just read `res.data` directly;
 * existing call sites can keep using this helper without changes.
 */

export type ApiSuccessBody<T> = { success: true; data: T };
export type ApiFailBody = { success: false; message: string };

export function unwrapApiData<T>(axiosData: unknown): T {
  // Defensive: if a caller still passes a raw envelope (e.g. axios was used
  // without our interceptor in a one-off place), peel it off here.
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
    "success" in axiosData &&
    (axiosData as ApiFailBody).success === false &&
    typeof (axiosData as ApiFailBody).message === "string"
  ) {
    throw new Error((axiosData as ApiFailBody).message);
  }
  // Otherwise the interceptor already unwrapped — return as-is.
  return axiosData as T;
}
