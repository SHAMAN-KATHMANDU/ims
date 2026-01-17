/**
 * Auth Types
 *
 * Type definitions for authentication.
 * State management is handled by stores/auth-store.ts (Zustand).
 */

export type UserRole = "superAdmin" | "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
