import { redirect } from "next/navigation";

/** Redirect legacy /crm/settings to global Settings > CRM. */
export default async function CrmSettingsRedirect({
  params,
}: {
  params: Promise<{ workspace?: string }>;
}) {
  const { workspace } = await params;
  const base = workspace ? `/${workspace}` : "/admin";
  redirect(`${base}/settings/crm`);
}
