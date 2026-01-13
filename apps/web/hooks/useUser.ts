"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "./useAxios";
import {
  UserService,
  type User,
  type CreateUserData,
  type UpdateUserData,
} from "@/services/userService";

// Re-export types for convenience
export type { User, CreateUserData, UpdateUserData };

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
export function useUsers() {
  const axios = useAxios();
  const userService = new UserService(axios);

  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: async () => {
      return await userService.getAllUsers();
    },
  });
}

/**
 * Hook for fetching a single user by ID
 */
export function useUser(id: string) {
  const axios = useAxios();
  const userService = new UserService(axios);

  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      return await userService.getUserById(id);
    },
    enabled: !!id, // Only fetch if id is provided
  });
}

/**
 * Hook for creating a new user
 */
export function useCreateUser() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const userService = new UserService(axios);

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      return await userService.createUser(data);
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Hook for updating a user
 */
export function useUpdateUser() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const userService = new UserService(axios);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      return await userService.updateUser(id, data);
    },
    onSuccess: (data, variables) => {
      // Invalidate both list and detail queries
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
  const axios = useAxios();
  const queryClient = useQueryClient();
  const userService = new UserService(axios);

  return useMutation({
    mutationFn: async (id: string) => {
      await userService.deleteUser(id);
    },
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
