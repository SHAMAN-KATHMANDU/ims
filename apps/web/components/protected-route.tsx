"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAuthToken } from "@/utils/auth"
import { LoadingPage } from "./loading-page"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for JWT token (placeholder)
    const token = getAuthToken()

    if (!token) {
      router.push("/401")
    } else {
      // In a real app, you would verify the token here
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return <LoadingPage />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
