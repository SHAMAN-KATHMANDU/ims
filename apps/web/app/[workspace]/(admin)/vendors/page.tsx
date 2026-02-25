import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { VendorsPageClient } from "@/views/vendors";
import { normalizeSearchParams } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Vendors | ${workspace}` };
}

export default async function Vendors({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const normalized = normalizeSearchParams(resolvedSearchParams, {
    defaultSortBy: "name",
    defaultSortOrder: "asc",
  });

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <VendorsPageClient initialData={undefined} initialParams={normalized} />
    </AuthGuard>
  );
}
