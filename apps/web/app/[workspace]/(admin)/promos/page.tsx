import { headers } from "next/headers";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { PromoPageClient } from "@/views/promos";
import { getPromosServer } from "@/services/promoServiceServer";
import { buildPromoListParamsFromSearch } from "@/lib/searchParams";

/** Promo Codes (full management) – admin/superAdmin only. Server-fetches initial data. */
export default async function Promos({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildPromoListParamsFromSearch(resolvedSearchParams);

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getPromosServer(cookie, workspace, listParams);

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PromoPageClient initialData={initialData} initialParams={listParams} />
    </AuthGuard>
  );
}
