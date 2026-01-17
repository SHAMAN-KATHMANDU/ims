import type React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * Admin Layout
 *
 * Wraps all /admin/* routes with authentication.
 * Server-side protection is handled by middleware.ts
 * AuthGuard handles client-side loading state.
 *
 * Note: Role-specific restrictions are handled at the page level,
 * not here. This layout just ensures the user is authenticated.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
