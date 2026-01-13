/**
 * User Service
 *
 * Service layer for user management operations
 * Follows MVC pattern - this is the Model/Controller layer
 * Handles all API calls related to users
 */

import { useAxios } from "@/hooks/useAxios";
import { type UserRoleType } from "shared";

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

export interface UsersResponse {
  message: string;
  users: User[];
}

export interface UserResponse {
  message: string;
  user: User;
}

/**
 * User Service Class
 * Provides methods for all user-related API operations
 */
export class UserService {
  private axios: ReturnType<typeof useAxios>;

  constructor(axiosInstance: ReturnType<typeof useAxios>) {
    this.axios = axiosInstance;
  }

  /**
   * Get all users (superAdmin only)
   */
  async getAllUsers(): Promise<User[]> {
    const response = await this.axios.get<UsersResponse>("/users");
    return response.data.users;
  }

  /**
   * Get user by ID (superAdmin only)
   */
  async getUserById(id: string): Promise<User> {
    const response = await this.axios.get<UserResponse>(`/users/${id}`);
    return response.data.user;
  }

  /**
   * Create a new user (superAdmin only)
   */
  async createUser(data: CreateUserData): Promise<User> {
    const response = await this.axios.post<UserResponse>("/users", data);
    return response.data.user;
  }

  /**
   * Update a user (superAdmin only)
   */
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await this.axios.put<UserResponse>(`/users/${id}`, data);
    return response.data.user;
  }

  /**
   * Delete a user (superAdmin only)
   */
  async deleteUser(id: string): Promise<void> {
    await this.axios.delete(`/users/${id}`);
  }
}
