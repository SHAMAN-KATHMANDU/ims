"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useLead, useUpdateLead } from "@/features/crm";
import { LeadForm } from "@/features/crm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data, isLoading } = useLead(id);
  const updateMutation = useUpdateLead();

  return (
    <>
      {isLoading || !data?.lead ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-4">
            <Link href={`${basePath}/crm/leads/${id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
            <h1 className="text-3xl font-bold">Edit Lead</h1>
          </div>
          <LeadForm
            defaultValues={{
              name: data.lead.name,
              email: data.lead.email ?? undefined,
              phone: data.lead.phone ?? undefined,
              companyName: data.lead.companyName ?? undefined,
              status: data.lead.status,
              source: data.lead.source ?? undefined,
              notes: data.lead.notes ?? undefined,
              assignedToId: data.lead.assignedToId,
            }}
            onSubmit={async (formData) => {
              await updateMutation.mutateAsync({ id, data: formData });
              toast({ title: "Lead updated" });
              router.push(`${basePath}/crm/leads/${id}`);
            }}
            onCancel={() => router.push(`${basePath}/crm/leads/${id}`)}
            isLoading={updateMutation.isPending}
          />
        </div>
      )}
    </>
  );
}
