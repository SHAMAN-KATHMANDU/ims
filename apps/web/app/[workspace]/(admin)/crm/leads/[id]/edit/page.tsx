"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useLead, useUpdateLead } from "@/hooks/useLeads";
import { LeadForm } from "@/views/crm/leads/LeadForm";
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

  if (isLoading || !data?.lead) {
    return <Skeleton className="h-96 w-full" />;
  }

  const lead = data.lead;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/leads/${id}`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Lead</h1>
      </div>
      <LeadForm
        defaultValues={{
          name: lead.name,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          companyName: lead.companyName ?? undefined,
          status: lead.status,
          source: lead.source ?? undefined,
          notes: lead.notes ?? undefined,
          assignedToId: lead.assignedToId,
        }}
        onSubmit={async (data) => {
          await updateMutation.mutateAsync({ id, data });
          toast({ title: "Lead updated" });
          router.push(`${basePath}/crm/leads/${id}`);
        }}
        onCancel={() => router.push(`${basePath}/crm/leads/${id}`)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
