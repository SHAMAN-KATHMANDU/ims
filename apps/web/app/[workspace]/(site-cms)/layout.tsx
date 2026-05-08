import type React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceSlugGuard } from "@/components/auth/workspace-slug-guard";
import { PlatformAdminRedirect } from "@/components/auth/platform-admin-redirect";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { ShellLayout } from "@/features/site-cms";

type Props = {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
};

export default async function SiteCmsLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";

  return (
    <AuthGuard loginPath={`/${slug}/login`}>
      <WorkspaceSlugGuard>
        <PlatformAdminRedirect>
          <OnboardingGuard>
            <ShellLayout>{children}</ShellLayout>
          </OnboardingGuard>
        </PlatformAdminRedirect>
      </WorkspaceSlugGuard>
    </AuthGuard>
  );
}
