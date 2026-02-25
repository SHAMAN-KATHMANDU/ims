import type { Metadata } from "next";
import { ContactsPageClient } from "@/views/crm/contacts/ContactsPage";
import { buildContactListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Contacts | ${workspace}` };
}

export default async function CrmContacts({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildContactListParamsFromSearch(resolvedSearchParams);

  return (
    <ContactsPageClient initialData={undefined} initialParams={listParams} />
  );
}
