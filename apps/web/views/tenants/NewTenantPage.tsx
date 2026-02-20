"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useCreateTenant } from "@/hooks/useTenant";
import { TenantForm } from "./components/TenantForm";

export function NewTenantPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateTenant();

  const handleSubmit = useCallback(
    async (data: {
      name: string;
      slug: string;
      plan: "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";
      adminUsername: string;
      adminPassword: string;
    }) => {
      try {
        await createMutation.mutateAsync({
          name: data.name,
          slug: data.slug,
          plan: data.plan,
          adminUsername: data.adminUsername,
          adminPassword: data.adminPassword,
        });
        toast({ title: "Tenant created successfully" });
        router.push(`${basePath}/platform/tenants`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create tenant";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [createMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/platform/tenants`);
  }, [router, basePath]);

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

      <TenantForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
