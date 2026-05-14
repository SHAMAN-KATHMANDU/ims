import type { ReactNode } from "react";
import { FeaturePageGuard } from "@/features/flags";
import { AuthGuard } from "@/components/auth/auth-guard";
import { getLoginPath, getWorkspaceRoot } from "@/constants/routes";
import { Feature } from "@repo/shared";

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

export default async function CrmLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        loginPath={getLoginPath(slug)}
        unauthorizedPath={getWorkspaceRoot(slug)}
      >
        {children}
      </AuthGuard>
    </FeaturePageGuard>
  );
}
