import { redirect } from "next/navigation";

/**
 * CRM reports moved to reports section. Redirect old crm/reports path.
 */
export default async function CrmReportsRedirect({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  redirect(`/${slug}/reports/crm`);
}
