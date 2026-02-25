import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { PromoPageClient } from "@/views/promos";
import { buildPromoListParamsFromSearch } from "@/lib/searchParams";

export default async function Promos({
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildPromoListParamsFromSearch(resolvedSearchParams);

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PromoPageClient initialData={undefined} initialParams={listParams} />
    </AuthGuard>
  );
}
