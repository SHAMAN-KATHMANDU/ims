"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import type { UserRole } from "@/utils/auth";
import { AuthGuard } from "./auth-guard";
import { getLoginPath, getWorkspaceRoot } from "@/constants/routes";

export interface AuthGuardWithWorkspaceProps {
  children: ReactNode;
  roles?: UserRole[];
  /** Overrides default `/${workspace}/login` from the URL segment. */
  loginPath?: string;
  /** When set, overrides the workspace taken from `useParams().workspace`. */
  workspaceSlug?: string;
}

/**
 * Like {@link AuthGuard} but sets `unauthorizedPath` and default `loginPath`
 * from the current `[workspace]` URL segment (not the static `/admin` root).
 */
export function AuthGuardWithWorkspace({
  children,
  roles,
  loginPath,
  workspaceSlug,
}: AuthGuardWithWorkspaceProps) {
  const fromUrl = ((useParams()?.workspace as string) ?? "").trim();
  const slug = workspaceSlug?.trim() || fromUrl || "admin";
  return (
    <AuthGuard
      roles={roles}
      loginPath={loginPath ?? getLoginPath(slug)}
      unauthorizedPath={getWorkspaceRoot(slug)}
    >
      {children}
    </AuthGuard>
  );
}
