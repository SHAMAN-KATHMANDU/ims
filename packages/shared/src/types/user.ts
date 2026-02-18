/**
 * User Role Enum
 *
 * Centralized definition of user roles used across the application.
 * This allows for single-source-of-truth role management.
 *
 * To add a new role:
 * 1. Add it to this enum
 * 2. Update the Prisma schema enum
 * 3. Update any role validation logic
 */
export enum UserRole {
  PLATFORM_ADMIN = "platformAdmin",
  SUPER_ADMIN = "superAdmin",
  ADMIN = "admin",
  USER = "user",
}

/**
 * Type alias for UserRole enum values
 * Useful for type annotations that accept any role value
 */
export type UserRoleType = UserRole;
