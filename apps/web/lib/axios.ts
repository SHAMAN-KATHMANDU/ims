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
 */

import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";

// API base URL from environment variable with fallback
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT token and tenant slug; allow multipart when body is FormData
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

    // When sending FormData, remove default Content-Type so axios/browser sets multipart/form-data with boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on login endpoint or if already on login page
      const requestUrl = error.config?.url || "";
      const isLoginEndpoint =
        requestUrl.includes("auth/login") || requestUrl.endsWith("/auth/login");
      const isOnLoginPage =
        typeof window !== "undefined" && window.location.pathname === "/login";

      if (!isLoginEndpoint && !isOnLoginPage) {
        // Clear auth state in Zustand store
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// Export the base URL for cases where it's needed
export { API_BASE_URL };
