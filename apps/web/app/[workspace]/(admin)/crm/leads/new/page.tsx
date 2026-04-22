"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useCreateLead } from "@/features/crm";
import { LeadForm } from "@/features/crm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewLeadPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateLead();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/leads`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">New Lead</h1>
      </div>
      <LeadForm
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
          toast({ title: "Lead created" });
          router.push(`${basePath}/crm/leads`);
        }}
        onCancel={() => router.push(`${basePath}/crm/leads`)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
