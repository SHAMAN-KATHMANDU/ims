import { headers } from "next/headers";
import type { Metadata } from "next";
import { ContactsPageClient } from "@/views/crm/contacts/ContactsPage";
import { getContactsServer } from "@/services/contactServiceServer";
import { buildContactListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Contacts | ${workspace}` };
}

/** CRM Contacts. Server-fetches initial data. */
export default async function CrmContacts({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildContactListParamsFromSearch(resolvedSearchParams);

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getContactsServer(cookie, workspace, listParams);

  return (
    <ContactsPageClient initialData={initialData} initialParams={listParams} />
  );
}
