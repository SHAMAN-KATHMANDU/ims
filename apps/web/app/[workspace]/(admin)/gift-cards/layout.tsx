import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { getLoginPath, getWorkspaceRoot } from "@/constants/routes";

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

export default async function GiftCardsLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      loginPath={getLoginPath(slug)}
      unauthorizedPath={getWorkspaceRoot(slug)}
    >
      {children}
    </AuthGuard>
  );
}
