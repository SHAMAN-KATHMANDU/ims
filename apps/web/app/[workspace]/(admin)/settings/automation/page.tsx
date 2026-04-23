import { redirect } from "next/navigation";

/**
 * /settings/automation → /settings/automations (permanent redirect).
 *
 * "automations" (plural) is the canonical URL for the automations section hub.
 * This stub exists only to avoid 404s for any bookmarked or linked /automation URLs.
 *
 * The workspace slug is injected by Next.js as a route param and forwarded so
 * the redirect lands on the correct tenant's page.
 */
export default async function AutomationRedirectPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/settings/automations`);
}
