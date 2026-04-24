import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceSlugGuard } from "@/components/auth/workspace-slug-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { PlatformShell } from "@/components/layout/platform-shell";

export const metadata: Metadata = {
  title: { template: "%s | Platform Admin", default: "Platform Admin" },
};

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

/**
 * Platform-admin layout — deliberately separate from `(admin)` and
 * `(superadmin)`. Mounts a lean shell (PlatformShell) with its own thin
 * sidebar/topbar so platform admins don't trigger any tenant-scoped data
 * hooks, CRM/inventory prefetches, sockets, media library, or command
 * palette mounts. Mirrors the `(editor)` shell pattern.
 *
 * Routes: /[workspace]/platform/* (route group `(platform)` is invisible
 * in the URL, the literal `platform` segment is preserved on the inside).
 */
export default async function PlatformLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard loginPath={`/${slug}/login`}>
      <WorkspaceSlugGuard>
        <RoleGuard
          allowedRoles={["platformAdmin"]}
          message="The platform admin console is reserved for platform administrators."
        >
          <PlatformShell>{children}</PlatformShell>
        </RoleGuard>
      </WorkspaceSlugGuard>
    </AuthGuard>
  );
}
