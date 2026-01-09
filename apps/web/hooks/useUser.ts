"use client"

import { useState, useEffect, useCallback } from "react"
import { useAxios } from "./useAxios"
import { UserService, type User, type CreateUserData, type UpdateUserData } from "@/services/userService"

// Re-export types for convenience
export type { User, CreateUserData, UpdateUserData }

/**
 * Hook for user management operations
 * Uses UserService for API calls
 * Only accessible to superAdmin role
 */
export function useUsers() {
  const axios = useAxios()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userService = new UserService(axios)

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await userService.getAllUsers()
        setUsers(data)
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to fetch users")
        console.error("Error fetching users:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const createUser = useCallback(async (data: CreateUserData) => {
    setIsLoading(true)
    setError(null)
    try {
      const newUser = await userService.createUser(data)
      setUsers((prev) => [...prev, newUser])
      return newUser
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create user"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userService])

  const updateUser = useCallback(async (id: string, data: UpdateUserData) => {
    setIsLoading(true)
    setError(null)
    try {
      const updatedUser = await userService.updateUser(id, data)
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)))
      return updatedUser
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to update user"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userService])

  const deleteUser = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await userService.deleteUser(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to delete user"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userService])

  const refreshUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await userService.getAllUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to refresh users")
      console.error("Error refreshing users:", err)
    } finally {
      setIsLoading(false)
    }
  }, [userService])

  return { users, isLoading, error, createUser, updateUser, deleteUser, refreshUsers }
}
