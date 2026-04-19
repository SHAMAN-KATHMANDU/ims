"use client";

import { useParams, useRouter } from "next/navigation";
import { useContact } from "@/features/crm";
import { ContactDetail } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const { data, isLoading } = useContact(id);

  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <div className="flex flex-col h-full min-h-screen">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`${basePath}/crm/contacts`)}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Contacts
            </Button>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ContactDetail
                contactId={id}
                contact={data?.contact}
                basePath={basePath}
                onClose={() => router.push(`${basePath}/crm/contacts`)}
              />
            </div>
          )}
        </div>
      </AuthGuard>
    </FeaturePageGuard>
  );
}
