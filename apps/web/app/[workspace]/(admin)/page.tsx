import { HomePage } from "@/views/dashboard/home";

/** Dashboard shows live data – never cache. */
export const dynamic = "force-dynamic";

export default function WorkspaceDashboardPage() {
  return <HomePage />;
}
