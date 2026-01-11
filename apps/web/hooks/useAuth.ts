"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAxios } from "./useAxios"
import { 
  setAuthToken, 
  removeAuthToken, 
  setAuthUser, 
  getAuthUser, 
  getAuthToken,
  type AuthUser 
} from "@/utils/auth"

interface LoginCredentials {
  username: string
  password: string
}

interface LoginResponse {
  token: string
  user: AuthUser
}

/**
 * Authentication hook
 * 
 * Design decisions:
 * - All auth logic centralized here
 * - Uses useAxios for API calls
 * - Manages auth state (user, isAuthenticated)
 * - Handles redirects after login/logout
 * - No direct API calls in components
 */
export function useAuth() {
  const axios = useAxios()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = getAuthToken()
    const storedUser = getAuthUser()
    
    if (token && storedUser) {
      setUser(storedUser)
      setIsAuthenticated(true)
    }
    
    setIsLoading(false)
  }, [])

  /**
   * Login function
   * Normalizes username, calls API, stores token/user, redirects
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Normalize username
      const normalizedUsername = credentials.username.trim().toLowerCase()
      
      const response = await axios.post<LoginResponse>("auth/login", {
        username: normalizedUsername,
        password: credentials.password,
      })

      const { token, user } = response.data

      // Store auth data
      setAuthToken(token)
      setAuthUser(user)
      setUser(user)
      setIsAuthenticated(true)

      // Redirect to admin dashboard
      router.push("/admin")
      router.refresh()

      return { token, user }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Login failed"
      throw new Error(errorMessage)
    }
  }, [axios, router])

  /**
   * Logout function
   * Calls API, clears state, redirects to login
   */
  const logout = useCallback(async () => {
    try {
      await axios.post("/auth/logout")
    } catch (error) {
      // Ignore logout errors - still clear local state
    } finally {
      removeAuthToken()
      setUser(null)
      setIsAuthenticated(false)
      router.push("/login")
      router.refresh()
    }
  }, [axios, router])

  return {
    login,
    logout,
    user,
    isAuthenticated,
    isLoading,
  }
}