import { UsersPage } from "@/views/users";

/**
 * Users Management Page
 *
 * Role restriction is handled inside UsersPage via RoleGuard.
 * This keeps the page component clean and puts authorization
 * logic with the view that needs it.
 */
export default function UsersManagementPage() {
  return <UsersPage />;
}
