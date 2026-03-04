/**
 * Re-exports auth hooks from features/auth for backward compatibility.
 * Prefer importing from @/features/auth for new code.
 */
export {
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  useTenant,
  authKeys,
} from "@/features/auth/hooks/use-auth";
