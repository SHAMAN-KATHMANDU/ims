import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PlatformBillingPage } from "@/views/platform-billing";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Platform Billing | ${workspace}` };
}

export default function BillingPage() {
  return (
    <AuthGuard roles={["platformAdmin"]}>
      <PlatformBillingPage />
    </AuthGuard>
  );
}
