"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useCreateCompany } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/features/crm";
import type { CreateCompanyData } from "@/features/crm";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function NewCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateCompany();

  const handleSubmit = async (data: CreateCompanyData) => {
    await createMutation.mutateAsync(data);
    toast({ title: "Company created" });
    router.push(`${basePath}/crm/companies`);
  };

  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`${basePath}/crm/companies`}>
              <Button variant="ghost">Back</Button>
            </Link>
            <h1 className="text-3xl font-bold">Add Company</h1>
          </div>
          <CompanyForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={() => router.push(`${basePath}/crm/companies`)}
            isLoading={createMutation.isPending}
          />
        </div>
      </AuthGuard>
    </FeaturePageGuard>
  );
}
