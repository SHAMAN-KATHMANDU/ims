import { redirect } from "next/navigation";

/**
 * Redirect legacy "System" (admin-controls) to Users.
 * Users and System were merged into a single "Users" entry in the settings sidebar.
 */
export default async function AdminControlsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/users`);
}
