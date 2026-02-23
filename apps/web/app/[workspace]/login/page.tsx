import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim().toLowerCase() || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-8">
      <Suspense
        fallback={<div className="text-muted-foreground">Loading...</div>}
      >
        <LoginForm tenantSlug={slug} tenantDisplayName={slug} />
      </Suspense>
    </div>
  );
}
