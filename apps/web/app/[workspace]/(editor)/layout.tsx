import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceSlugGuard } from "@/components/auth/workspace-slug-guard";

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

/**
 * Full-screen editor layout — no sidebar, no topbar.
 * Wraps with auth + workspace guards only.
 * Used by /[workspace]/site-editor for the Webflow-style block editor.
 */
export default async function EditorLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard loginPath={`/${slug}/login`}>
      <WorkspaceSlugGuard>{children}</WorkspaceSlugGuard>
    </AuthGuard>
  );
}
