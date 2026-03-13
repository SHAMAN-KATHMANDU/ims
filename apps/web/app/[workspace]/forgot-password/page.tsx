import { ForgotPasswordPage } from "@/features/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Forgot Password" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function ForgotPasswordRoute({ params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim().toLowerCase() || "";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <ThemeToggle className="absolute right-4 top-4" />
      <ForgotPasswordPage tenantSlug={slug} />
    </div>
  );
}
