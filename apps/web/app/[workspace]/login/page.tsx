import { LoginForm } from "@/features/auth";

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim().toLowerCase() || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <LoginForm tenantSlug={slug} />
    </div>
  );
}
