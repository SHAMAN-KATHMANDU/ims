import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";

export default function GiftCardsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      {children}
    </AuthGuard>
  );
}
