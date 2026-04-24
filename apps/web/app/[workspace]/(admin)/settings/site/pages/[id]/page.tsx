"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PermissionGate } from "@/features/permissions";
import { TenantPageEditor, useTenantPage } from "@/features/tenant-pages";

type Props = {
  params: Promise<{ workspace: string; id: string }>;
};

export default function EditTenantPageRoute({ params }: Props) {
  const { workspace, id } = use(params);
  const { data: page, isLoading, isError } = useTenantPage(id);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !page) {
    notFound();
  }

  return (
    <PermissionGate perm="WEBSITE.PAGES.UPDATE">
      <TenantPageEditor
        page={page}
        backHref={`/${workspace}/settings/site/pages`}
      />
    </PermissionGate>
  );
}
