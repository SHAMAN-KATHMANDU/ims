import { ProfilePage } from "@/features/users/components/ProfilePage";

export const metadata = { title: "Profile" };

/**
 * Self-service profile page. Available to every authenticated user — the
 * parent (admin) layout's AuthGuard is sufficient.
 */
export default function Profile() {
  return <ProfilePage />;
}
