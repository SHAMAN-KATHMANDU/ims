"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useContact, useUpdateContact } from "@/features/crm";
import { ContactForm } from "@/features/crm";
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

  return (
    <>
      {isLoading || !data?.contact ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-6 max-w-2xl px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href={`${basePath}/crm/contacts/${id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
            <h1 className="text-3xl font-bold">Edit Contact</h1>
          </div>
          <ContactForm
            defaultValues={{
              firstName: data.contact.firstName,
              lastName: data.contact.lastName ?? undefined,
              email: data.contact.email ?? undefined,
              phone: data.contact.phone ?? undefined,
              companyId: data.contact.companyId ?? undefined,
              tagIds: data.contact.tagLinks?.map((l) => l.tag.id),
              source: data.contact.source ?? undefined,
            }}
            onSubmit={async (formData) => {
              await updateMutation.mutateAsync({ id, data: formData });
              toast({ title: "Contact updated" });
              router.push(`${basePath}/crm/contacts/${id}`);
            }}
            onCancel={() => router.push(`${basePath}/crm/contacts/${id}`)}
            isLoading={updateMutation.isPending}
          />
        </div>
      )}
    </>
  );
}
