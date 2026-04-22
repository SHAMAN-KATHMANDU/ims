import type { ReactNode } from "react";
import { FeaturePageGuard } from "@/features/flags";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { Feature } from "@repo/shared";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        {children}
      </AuthGuard>
    </FeaturePageGuard>
  );
}
