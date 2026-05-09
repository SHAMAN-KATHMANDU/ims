import { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { ContentShell } from "@/features/cms-shell";

interface ContentLayoutProps {
  children: ReactNode;
}

export default function ContentLayout({ children }: ContentLayoutProps) {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.VIEW">
          <ContentShell>{children}</ContentShell>
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
