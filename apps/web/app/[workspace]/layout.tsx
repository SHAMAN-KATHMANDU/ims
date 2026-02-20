import type React from "react";

/**
 * Dynamic [workspace] layout. The first path segment is the tenant slug (e.g. /ruby, /system).
 * - /[slug]/login → login page (no auth required)
 * - /[slug]/... (rest) → (admin) layout with AuthGuard and DashboardLayout
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
