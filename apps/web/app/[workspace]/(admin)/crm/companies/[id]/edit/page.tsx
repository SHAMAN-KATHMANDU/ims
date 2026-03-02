"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyForm } from "@/views/crm/companies/CompanyForm";
import type { CreateCompanyData } from "@/services/companyService";

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data, isLoading } = useCompany(id);
  const updateMutation = useUpdateCompany();
  const company = data?.company;

  const handleSubmit = async (formData: CreateCompanyData) => {
    await updateMutation.mutateAsync({ id, data: formData });
    toast({ title: "Company updated" });
    router.push(`${basePath}/crm/companies`);
  };

  if (isLoading || !company) {
    return <Skeleton className="h-96 w-full max-w-2xl" />;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/crm/companies`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Company</h1>
      </div>
      <CompanyForm
        mode="edit"
        defaultValues={{
          name: company.name,
          website: company.website ?? undefined,
          address: company.address ?? undefined,
          phone: company.phone ?? undefined,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`${basePath}/crm/companies`)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
