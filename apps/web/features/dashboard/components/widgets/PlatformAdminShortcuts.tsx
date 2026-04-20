"use client";

/**
 * Platform Admin dashboard: Tenant management shortcuts.
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
import { Building2, Plus, ArrowRight } from "lucide-react";

export const WIDGET_ID = "platformadmin-shortcuts";
export const REQUIRED_ROLES = ["platformAdmin"] as const;
export const DATA_SOURCE = "none";
export const REFRESH_BEHAVIOR = "static";

interface PlatformAdminShortcutsProps {
  basePath: string;
}

export function PlatformAdminShortcuts({
  basePath,
}: PlatformAdminShortcutsProps) {
  const links = [
    {
      href: `${basePath}/platform/tenants`,
      label: "Tenants",
      icon: Building2,
    },
    {
      href: `${basePath}/platform/tenants/new`,
      label: "Add tenant",
      icon: Plus,
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Quick links</CardTitle>
        <CardDescription>Tenant management</CardDescription>
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
