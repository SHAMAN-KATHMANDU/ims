"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLead } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const { data, isLoading } = useLead(id);

  if (isLoading || !data?.lead) {
    return <Skeleton className="h-96 w-full" />;
  }

  const lead = data.lead;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/leads`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">{lead.name}</h1>
      </div>
      <div className="space-y-2">
        {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
        {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
        <p>
          Status: <span className="font-medium">{lead.status}</span>
        </p>
        {lead.source && <p>Source: {lead.source}</p>}
        {lead.companyName && <p>Company: {lead.companyName}</p>}
        {lead.notes && <p className="mt-4">{lead.notes}</p>}
      </div>
      <div className="flex gap-2">
        <Link href={`${basePath}/crm/leads/${id}/edit`}>
          <Button>Edit</Button>
        </Link>
      </div>
    </div>
  );
}
