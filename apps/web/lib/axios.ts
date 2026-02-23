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
import { useAuthStore } from "@/stores/auth-store";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/hooks/useToast";
import { refreshSession } from "@/services/authService";

// API base URL from environment variable with fallback
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Create axios instance (withCredentials so cookies are sent)
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
  skipGlobalErrorToast?: boolean;
  skipAuthRedirect?: boolean;
};

let isRefreshing = false;
let refreshSubscribers: Array<(error?: unknown) => void> = [];

const subscribeToRefresh = (callback: (error?: unknown) => void) => {
  refreshSubscribers.push(callback);
};

const notifyRefreshSubscribers = (error?: unknown) => {
  refreshSubscribers.forEach((callback) => callback(error));
  refreshSubscribers = [];
};

// Request interceptor: Attach tenant slug; allow multipart when body is FormData (auth via HttpOnly cookie)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = useAuthStore.getState();

    // Attach tenant slug to every request (if available and not already set)
    if (
      state.tenant?.slug &&
      config.headers &&
      !config.headers["X-Tenant-Slug"]
    ) {
      config.headers["X-Tenant-Slug"] = state.tenant.slug;
    }

    // When sending FormData, remove default Content-Type so axios/browser sets multipart/form-data with boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Handle 401 globally; show toast for all other API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const originalRequest = (error.config || {}) as RetriableRequestConfig;
    const requestUrl = originalRequest.url || "";
    const isAuthMe = requestUrl.includes("/auth/me");
    const isLoginEndpoint =
      requestUrl.includes("auth/login") || requestUrl.endsWith("/auth/login");
    const isRefreshEndpoint =
      requestUrl.includes("auth/refresh") ||
      requestUrl.endsWith("/auth/refresh");
    const shouldAttemptRefresh =
      status === 401 &&
      !isLoginEndpoint &&
      !isRefreshEndpoint &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest._retry;

    if (shouldAttemptRefresh) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((refreshError) => {
            if (refreshError) {
              reject(error);
              return;
            }
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      return refreshSession()
        .then((refreshData) => {
          if (refreshData?.tenant) {
            useAuthStore.getState().setTenant(refreshData.tenant);
          }
          notifyRefreshSubscribers();
          return api(originalRequest);
        })
        .catch((refreshError) => {
          notifyRefreshSubscribers(refreshError);
          throw error;
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    if (status === 401 || (status === 404 && isAuthMe)) {
      if (originalRequest.skipAuthRedirect) {
        return Promise.reject(error);
      }
      if (isLoginEndpoint || isRefreshEndpoint) return Promise.reject(error);

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
    } else {
      const skipToast = originalRequest.skipGlobalErrorToast;

      // Plan limit errors get a dedicated dialog instead of a generic toast
      const isPlanLimit =
        status === 403 && error.response?.data?.error === "plan_limit_reached";

      if (isPlanLimit && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("plan-limit-reached", {
            detail: error.response!.data,
          }),
        );
      } else if (typeof window !== "undefined" && skipToast !== true) {
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
