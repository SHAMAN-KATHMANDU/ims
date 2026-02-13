"use client";

import { useParams, useRouter } from "next/navigation";
import { useContact } from "@/hooks/useContacts";
import { ContactDetail } from "@/views/crm/contacts/ContactDetail";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const { data, isLoading } = useContact(id);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="max-w-2xl">
      <ContactDetail
        contactId={id}
        contact={data?.contact}
        basePath={basePath}
        onClose={() => router.push(`${basePath}/crm/contacts`)}
      />
    </div>
  );
}
