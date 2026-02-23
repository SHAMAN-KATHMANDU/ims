import { headers } from "next/headers";
import type { Metadata } from "next";
import { MembersPageClient } from "@/views/members";
import { getMembersServer } from "@/services/memberServiceServer";
import { normalizeSearchParams } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Members | ${workspace}` };
}

/** Route shell; server-fetches initial data and passes to client view. */
export default async function Members({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const normalized = normalizeSearchParams(resolvedSearchParams);

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getMembersServer(cookie, workspace, normalized);

  return (
    <MembersPageClient initialData={initialData} initialParams={normalized} />
  );
}
