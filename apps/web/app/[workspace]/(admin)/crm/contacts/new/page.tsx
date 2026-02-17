"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useCreateContact } from "@/hooks/useContacts";
import { ContactForm } from "@/views/crm/contacts/ContactForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewContactPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateContact();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/contacts`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">New Contact</h1>
      </div>
      <ContactForm
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
          toast({ title: "Contact created" });
          router.push(`${basePath}/crm/contacts`);
        }}
        onCancel={() => router.push(`${basePath}/crm/contacts`)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
