import type { Metadata } from "next";
import { MembersPageClient } from "@/views/members";
import { normalizeSearchParams } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Members | ${workspace}` };
}

export default async function Members({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const normalized = normalizeSearchParams(resolvedSearchParams);

  return (
    <MembersPageClient initialData={undefined} initialParams={normalized} />
  );
}
