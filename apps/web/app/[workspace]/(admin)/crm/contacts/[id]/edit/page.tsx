"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useContact, useUpdateContact } from "@/hooks/useContacts";
import { ContactForm } from "@/views/crm/contacts/ContactForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data, isLoading } = useContact(id);
  const updateMutation = useUpdateContact();

  if (isLoading || !data?.contact) {
    return <Skeleton className="h-96 w-full" />;
  }

  const contact = data.contact;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/contacts/${id}`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Contact</h1>
      </div>
      <ContactForm
        defaultValues={{
          firstName: contact.firstName,
          lastName: contact.lastName ?? undefined,
          email: contact.email ?? undefined,
          phone: contact.phone ?? undefined,
          companyId: contact.companyId ?? undefined,
          memberId: contact.memberId ?? undefined,
          tagIds: contact.tagLinks?.map((l) => l.tag.id),
        }}
        onSubmit={async (data) => {
          await updateMutation.mutateAsync({ id, data });
          toast({ title: "Contact updated" });
          router.push(`${basePath}/crm/contacts/${id}`);
        }}
        onCancel={() => router.push(`${basePath}/crm/contacts/${id}`)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
