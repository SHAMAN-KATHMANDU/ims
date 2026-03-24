"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLead } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const { data, isLoading } = useLead(id);

  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        {isLoading || !data?.lead ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
              <Link href={`${basePath}/crm/leads`}>
                <Button variant="ghost">Back</Button>
              </Link>
              <h1 className="text-3xl font-bold">{data.lead.name}</h1>
            </div>
            <div className="space-y-2">
              {data.lead.email && (
                <p className="text-muted-foreground">{data.lead.email}</p>
              )}
              {data.lead.phone && (
                <p className="text-muted-foreground">{data.lead.phone}</p>
              )}
              <p>
                Status: <span className="font-medium">{data.lead.status}</span>
              </p>
              {data.lead.source && <p>Source: {data.lead.source}</p>}
              {data.lead.companyName && <p>Company: {data.lead.companyName}</p>}
              {data.lead.notes && <p className="mt-4">{data.lead.notes}</p>}
            </div>
            <div className="flex gap-2">
              <Link href={`${basePath}/crm/leads/${id}/edit`}>
                <Button>Edit</Button>
              </Link>
            </div>
          </div>
        )}
      </AuthGuard>
    </FeaturePageGuard>
  );
}
