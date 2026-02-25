import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { LocationsPageClient } from "@/views/locations";
import type { LocationListParams } from "@/services/locationService";
import { buildLocationListParamsFromSearch } from "@/lib/searchParams";

export default async function Locations({
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildLocationListParamsFromSearch(
    resolvedSearchParams,
  ) as LocationListParams;

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <LocationsPageClient initialData={undefined} initialParams={listParams} />
    </AuthGuard>
  );
}
