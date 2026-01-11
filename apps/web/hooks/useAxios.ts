"use client"

import { useMemo } from "react"
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios"
import { getAuthToken, removeAuthToken } from "@/utils/auth"

/**
 * Custom hook that returns a configured Axios instance
 * 
 * Design decisions:
 * - Single instance per component to avoid global state
 * - Interceptors handle auth automatically
 * - 401 responses trigger logout and redirect (except for login endpoint)
 * - Base URL from env var for flexibility
 */
export function useAxios(): AxiosInstance {
  return useMemo(() => {
    const instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Request interceptor: Attach JWT token to all requests
    instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = getAuthToken()
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor: Handle 401 globally (except for login endpoint)
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Don't redirect on login endpoint or if already on login page
          const requestUrl = error.config?.url || ""
          const isLoginEndpoint = requestUrl.includes("auth/login") || requestUrl.endsWith("/auth/login")
          const isOnLoginPage = typeof window !== "undefined" && window.location.pathname === "/login"
          
          if (!isLoginEndpoint && !isOnLoginPage) {
            removeAuthToken()
            if (typeof window !== "undefined") {
              window.location.href = "/login"
            }
          }
        }
        return Promise.reject(error)
      }
    )

    return instance
  }, [])
}