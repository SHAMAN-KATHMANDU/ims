/**
 * Axios Instance Configuration
 *
 * Single source of truth for HTTP client configuration.
 * All services must use this instance; do not create other axios instances for API calls.
 *
 * Features:
 * - Base URL from environment variable
 * - Automatic auth token injection from Zustand store
 * - Automatic tenant slug injection (X-Tenant-Slug header)
 * - Silent refresh on 401 via /auth/refresh; only logs out when refresh itself fails
 * - Global toast on API error (except handled 401s)
 */

import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/hooks/useToast";

// Extend AxiosRequestConfig so every call-site can pass skipGlobalErrorToast
// without casting. The response interceptor reads this flag to suppress the
// global error toast when a mutation already handles errors in its own onError.
declare module "axios" {
  export interface AxiosRequestConfig {
    /** When true, the response interceptor will NOT show a global error toast.
     *  Use in mutations that handle errors in their own onError handler to
     *  avoid showing a duplicate toast from both the interceptor and the hook. */
    skipGlobalErrorToast?: boolean;
    /** Internal flag set by the interceptor when replaying a request after a
     *  successful silent refresh. Prevents a refresh→retry→refresh loop. */
    _retriedAfterRefresh?: boolean;
  }
}

// API base URL from environment variable with fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Simple UUID v4 for correlation IDs (no crypto import needed in browser)
function randomCorrelationId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Request interceptor: Attach JWT token, tenant slug, correlation ID; allow multipart when body is FormData
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Access Zustand store directly (not a hook - this is outside React)
    const state = useAuthStore.getState();

    if (state.token && config.headers) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }

    // Attach tenant slug to every request (if available and not already set)
    if (
      state.tenant?.slug &&
      config.headers &&
      !config.headers["X-Tenant-Slug"]
    ) {
      config.headers["X-Tenant-Slug"] = state.tenant.slug;
    }

    // Correlation ID for distributed tracing (backend propagates to logs)
    if (config.headers && !config.headers["X-Correlation-ID"]) {
      config.headers["X-Correlation-ID"] = randomCorrelationId();
    }

    // When sending FormData, remove default Content-Type so axios/browser sets multipart/form-data with boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Silent-refresh state ────────────────────────────────────────────────────
//
// While a refresh is in flight, every other 401 must wait on the same promise
// so we issue exactly ONE /auth/refresh call per access-token expiry, not one
// per concurrent request. After it resolves, queued requests replay with the
// new access token; if it rejects, every queued request rejects with the
// original 401 and we trigger a single logout.
let refreshPromise: Promise<string | null> | null = null;

function isLoginUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("/auth/login");
}

function isRefreshUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("/auth/refresh");
}

/** Hard logout: clear store and bounce to the tenant's /login page. */
function forceLogoutRedirect(): void {
  useAuthStore.getState().clearAuth();
  if (typeof window === "undefined") return;
  const segments = window.location.pathname.split("/").filter(Boolean);
  const slug = segments[0];
  const isOnLoginPage = segments[1] === "login";
  if (!isOnLoginPage) {
    window.location.href = slug ? `/${slug}/login` : "/";
  }
}

/**
 * Run the refresh round-trip. De-duped via `refreshPromise` so concurrent
 * 401s share a single network call. Resolves to the new access token, or
 * null if refresh failed (caller is then responsible for logging out).
 */
async function runRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const currentRefresh = useAuthStore.getState().refreshToken;
  if (!currentRefresh) return null;

  refreshPromise = (async () => {
    try {
      // Use a bare axios call (not the `api` instance) so we don't recurse
      // into this interceptor on a refresh failure.
      const { data } = await axios.post<{
        token: string;
        refreshToken: string;
      }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: currentRefresh },
        { headers: { "Content-Type": "application/json" } },
      );
      if (!data?.token || !data?.refreshToken) return null;
      useAuthStore.getState().setTokens(data.token, data.refreshToken);
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Response interceptor: auto-unwrap the {success: true, data: T} envelope
// produced by apps/api/src/shared/response/ok(), then handle 401 by running
// a silent refresh (with queueing) and replaying the original request.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (
      body &&
      typeof body === "object" &&
      "success" in body &&
      (body as { success: unknown }).success === true &&
      "data" in body
    ) {
      response.data = (body as { data: unknown }).data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = (error.config ?? {}) as InternalAxiosRequestConfig;
    const requestUrl = config.url || "";

    // No response (network error, API restarting, CORS preflight failure):
    // do NOT log out. Just surface the error. Cached state stays intact so
    // the user is still logged in once the API comes back.
    if (!error.response) {
      return Promise.reject(error);
    }

    // Login + refresh endpoints handle their own auth errors. A 401 from
    // /auth/login means wrong credentials; a 401 from /auth/refresh means
    // the refresh token itself is dead and we have to force a logout.
    if (status === 401 && isRefreshUrl(requestUrl)) {
      forceLogoutRedirect();
      return Promise.reject(error);
    }
    if (status === 401 && isLoginUrl(requestUrl)) {
      return Promise.reject(error);
    }

    // 401 elsewhere: try a silent refresh exactly once per request, then
    // replay the original call with the new access token. The refresh call
    // itself is de-duped across concurrent 401s.
    if (status === 401 && !config._retriedAfterRefresh) {
      const newToken = await runRefresh();
      if (!newToken) {
        forceLogoutRedirect();
        return Promise.reject(error);
      }
      config._retriedAfterRefresh = true;
      if (!config.headers) config.headers = new AxiosHeaders();
      (config.headers as AxiosHeaders).set(
        "Authorization",
        `Bearer ${newToken}`,
      );
      return api.request(config as AxiosRequestConfig);
    }

    // Everything else: surface via toast unless the caller opted out.
    const skipToast = config.skipGlobalErrorToast;
    if (typeof window !== "undefined" && skipToast !== true) {
      const message = getApiErrorMessage(error);
      toast({ title: message, variant: "destructive" });
    }
    return Promise.reject(error);
  },
);

export default api;

// Export the base URL for cases where it's needed
export { API_BASE_URL };
