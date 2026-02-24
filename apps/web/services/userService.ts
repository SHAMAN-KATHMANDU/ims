/**
 * User Service
 *
 * Service layer for user management operations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import { type UserRoleType } from "@repo/shared";

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  username: string;
  role: UserRoleType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  role: UserRoleType;
}

export interface UpdateUserData {
  username?: string;
  password?: string;
  role?: UserRoleType;
}

interface UsersResponse {
  message: string;
  data: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface UserResponse {
  message: string;
  user: User;
}

// ============================================
// API Functions
// ============================================

export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Get all users (superAdmin only). Pass page/limit for dropdowns (e.g. { page: 1, limit: 100 }).
 */
export async function getAllUsers(params?: GetAllUsersParams): Promise<User[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.set("page", String(params.page));
    if (params?.limit != null) queryParams.set("limit", String(params.limit));
    if (params?.sortBy != null) queryParams.set("sortBy", params.sortBy);
    if (params?.sortOrder != null)
      queryParams.set("sortOrder", params.sortOrder);
    const query = queryParams.toString();
    const url = query ? `/users?${query}` : "/users";
    const response = await api.get<UsersResponse>(url);
    return response.data?.data ?? [];
  } catch (error) {
    handleApiError(error, "fetch users");
  }
}

/**
 * Get user by ID (superAdmin only)
 */
export async function getUserById(id: string): Promise<User> {
  if (!id?.trim()) {
    throw new Error("User ID is required");
  }

  try {
    const response = await api.get<{ data?: UserResponse }>(`/users/${id}`);
    const user = response.data?.data?.user;
    if (!user) throw new Error("Invalid response from server");
    return user;
  } catch (error) {
    handleApiError(error, `fetch user "${id}"`);
  }
}

/**
 * Create a new user (superAdmin only)
 */
export async function createUser(data: CreateUserData): Promise<User> {
  if (!data.username?.trim()) {
    throw new Error("Username is required");
  }
  if (!data.password) {
    throw new Error("Password is required");
  }
  if (!data.role) {
    throw new Error("Role is required");
  }

  try {
    const response = await api.post<{ data?: UserResponse }>("/users", data);
    const user = response.data?.data?.user;
    if (!user) throw new Error("Invalid response from server");
    return user;
  } catch (error) {
    handleApiError(error, "create user");
  }
}

/**
 * Update a user (superAdmin only)
 */
export async function updateUser(
  id: string,
  data: UpdateUserData,
): Promise<User> {
  if (!id?.trim()) {
    throw new Error("User ID is required");
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    const response = await api.put<{ data?: UserResponse }>(
      `/users/${id}`,
      data,
    );
    const user = response.data?.data?.user;
    if (!user) throw new Error("Invalid response from server");
    return user;
  } catch (error) {
    handleApiError(error, `update user "${id}"`);
  }
}

/**
 * Delete a user (superAdmin only)
 */
export async function deleteUser(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("User ID is required");
  }

  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    handleApiError(error, `delete user "${id}"`);
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!userId?.trim()) {
    throw new Error("User ID is required");
  }
  if (!currentPassword) {
    throw new Error("Current password is required");
  }
  if (!newPassword) {
    throw new Error("New password is required");
  }

  try {
    await api.put(`/users/${userId}`, {
      password: newPassword,
      currentPassword,
    });
  } catch (error) {
    handleApiError(error, "change password");
  }
}
