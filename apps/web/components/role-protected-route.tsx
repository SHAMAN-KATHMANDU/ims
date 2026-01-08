"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAuthToken, getUserRole, getAuthUser, getCurrentUser, type UserRole } from "@/utils/auth"
import { LoadingPage } from "./loading-page"

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  fallbackPath = "/401"
}: RoleProtectedRouteProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuthorization = async () => {
      const token = getAuthToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      // Try to get user from localStorage first
      let user = getAuthUser()
      
      // If no user in localStorage, fetch from API
      if (!user) {
        user = await getCurrentUser()
        if (!user) {
          router.push("/login")
          return
        }
      }

      const userRole = user.role

      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        router.push(fallbackPath)
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    }

    checkAuthorization()
  }, [router, allowedRoles, fallbackPath])

  if (isLoading) {
    return <LoadingPage />
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

