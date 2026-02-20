"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateTenantDialog } from "./components/CreateTenantDialog";

/**
 * Standalone page for creating a tenant. Uses the shared CreateTenantDialog.
 * Redirects to tenants list when the dialog is closed.
 */
export function NewTenantPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push(`${basePath}/platform/tenants`);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/platform/tenants`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">New tenant</h1>
        <p className="text-muted-foreground mt-1">
          Onboard a new organization and create an initial admin user
        </p>
      </div>

      <CreateTenantDialog open={true} onOpenChange={handleOpenChange} />
    </div>
  );
}
