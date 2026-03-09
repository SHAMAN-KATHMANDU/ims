"use client";

/**
 * Super Admin dashboard: Admin controls shortcuts.
 * Links only; no API.
 */

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Settings, Bug, ArrowRight } from "lucide-react";

export const WIDGET_ID = "superadmin-shortcuts";
export const REQUIRED_ROLES = ["superAdmin"] as const;
export const DATA_SOURCE = "none";
export const REFRESH_BEHAVIOR = "static";

interface SuperAdminShortcutsProps {
  basePath: string;
}

export function SuperAdminShortcuts({ basePath }: SuperAdminShortcutsProps) {
  const links = [
    { href: `${basePath}/users`, label: "User management", icon: Users },
    {
      href: `${basePath}/admin-controls`,
      label: "System settings",
      icon: Settings,
    },
    {
      href: `${basePath}/settings/error-reports`,
      label: "Error reports",
      icon: Bug,
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Admin controls</CardTitle>
        <CardDescription>User management and system</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
