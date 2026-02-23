import { headers } from "next/headers";
import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { VendorsPageClient } from "@/views/vendors";
import { getVendorsServer } from "@/services/vendorServiceServer";
import { normalizeSearchParams } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Vendors | ${workspace}` };
}

/** Vendors – admin/superAdmin only. Server-fetches initial data. */
export default async function Vendors({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const normalized = normalizeSearchParams(resolvedSearchParams, {
    defaultSortBy: "name",
    defaultSortOrder: "asc",
  });

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getVendorsServer(cookie, workspace, normalized);

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <VendorsPageClient initialData={initialData} initialParams={normalized} />
    </AuthGuard>
  );
}
