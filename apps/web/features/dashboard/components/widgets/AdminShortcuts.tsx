"use client";

/**
 * Admin dashboard: Shortcuts — Analytics, Manage inventory, View reports.
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
import { BarChart3, Package, ArrowRight } from "lucide-react";

export const WIDGET_ID = "admin-shortcuts";
export const REQUIRED_ROLES = ["admin", "superAdmin"] as const;
export const DATA_SOURCE = "none";
export const REFRESH_BEHAVIOR = "static";

interface AdminShortcutsProps {
  basePath: string;
}

export function AdminShortcuts({ basePath }: AdminShortcutsProps) {
  const links = [
    {
      href: `${basePath}/reports/analytics/sales`,
      label: "Analytics",
      icon: BarChart3,
    },
    { href: `${basePath}/locations`, label: "Manage inventory", icon: Package },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Shortcuts</CardTitle>
        <CardDescription>Go to analytics or inventory</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
