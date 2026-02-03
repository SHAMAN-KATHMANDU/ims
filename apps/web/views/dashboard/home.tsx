"use client";

/**
 * Dashboard container: single route, role-based widget composition.
 * Role is read once; widget visibility is determined by registry, not scattered checks.
 */

import { useParams } from "next/navigation";
import { useAuthStore, selectUserRole } from "@/stores/auth-store";
import { getWidgetsForRole } from "@/views/dashboard/widgets/registry";
import { DashboardWidgetBoundary } from "@/views/dashboard/widgets/DashboardWidgetBoundary";
import type { UserRole } from "@/utils/auth";

const TITLES: Record<UserRole, { title: string; subtitle: string }> = {
  user: {
    title: "Dashboard",
    subtitle: "Your overview and quick links",
  },
  admin: {
    title: "Admin Dashboard",
    subtitle: "Business operations and alerts",
  },
  superAdmin: {
    title: "Super Admin Dashboard",
    subtitle: "System health and governance",
  },
};

export function HomePage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const userRole = useAuthStore(selectUserRole);

  if (!userRole) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const widgets = getWidgetsForRole(userRole);
  const { title, subtitle } = TITLES[userRole];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">{title}</h1>
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 min-w-0">
        {widgets.map((widget) => {
          const Component = widget.component;
          const isKpiWidget = widget.id.endsWith("kpi-cards");
          return (
            <DashboardWidgetBoundary key={widget.id} widgetId={widget.id}>
              <div className={`min-w-0 ${isKpiWidget ? "lg:col-span-2" : ""}`}>
                <Component basePath={basePath} />
              </div>
            </DashboardWidgetBoundary>
          );
        })}
      </div>
    </div>
  );
}
