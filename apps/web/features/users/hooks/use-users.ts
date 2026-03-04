"use client";

/**
 * React Query wrappers for users. Business logic and API calls live in userService; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type CreateUserData,
  type UpdateUserData,
  type GetAllUsersParams,
  type UsersResult,
} from "../services/user.service";

// Re-export types for convenience
export type {
  User,
  CreateUserData,
  UpdateUserData,
  GetAllUsersParams,
  UsersResult,
};

// Query keys
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Hook for fetching all users
 */
export function useUsers(params?: GetAllUsersParams) {
  return useQuery({
    queryKey: [...userKeys.lists(), params],
    queryFn: () => getAllUsers(params),
  });
}

/**
 * Hook for fetching a single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUserById(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Hook for updating a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook for deleting a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
