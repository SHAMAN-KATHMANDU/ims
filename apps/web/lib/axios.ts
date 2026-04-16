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
 * - 401 response handling (auto-logout)
 * - Global toast on API error (except 401)
 */

import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/hooks/useToast";

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

// Guard against multiple concurrent 401s all triggering logout + redirect.
let isHandling401 = false;

// Response interceptor: Handle 401 globally; show toast for all other API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isAuthMe = requestUrl.includes("/auth/me");
    const isLoginEndpoint =
      requestUrl.includes("auth/login") || requestUrl.endsWith("/auth/login");

    if (status === 401 || (status === 404 && isAuthMe)) {
      if (isLoginEndpoint) return Promise.reject(error);
      if (isHandling401) return Promise.reject(error);

      isHandling401 = true;
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const segments = pathname.split("/").filter(Boolean);
      const slug = segments[0];
      const isOnLoginPage = segments[1] === "login";

      if (!isOnLoginPage) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          const loginPath = slug ? `/${slug}/login` : "/";
          window.location.href = loginPath;
        }
      }
      setTimeout(() => {
        isHandling401 = false;
      }, 3000);
    } else {
      const skipToast = (
        error.config as { skipGlobalErrorToast?: boolean } | undefined
      )?.skipGlobalErrorToast;
      if (typeof window !== "undefined" && skipToast !== true) {
        const message = getApiErrorMessage(error);
        toast({ title: message, variant: "destructive" });
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// Export the base URL for cases where it's needed
export { API_BASE_URL };
