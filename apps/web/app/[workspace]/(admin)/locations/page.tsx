import { headers } from "next/headers";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { LocationsPageClient } from "@/views/locations";
import { getLocationsServer } from "@/services/locationServiceServer";
import type { LocationListParams } from "@/services/locationService";
import { buildLocationListParamsFromSearch } from "@/lib/searchParams";

/** Locations – admin/superAdmin only. Server-fetches initial data. */
export default async function Locations({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildLocationListParamsFromSearch(
    resolvedSearchParams,
  ) as LocationListParams;

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getLocationsServer(cookie, workspace, listParams);

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <LocationsPageClient
        initialData={initialData}
        initialParams={listParams}
      />
    </AuthGuard>
  );
}
