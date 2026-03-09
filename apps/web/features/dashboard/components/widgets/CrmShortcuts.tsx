"use client";

/**
 * CRM shortcuts - links to CRM dashboard, contacts, leads, deals.
 */

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  Contact,
  Target,
  Handshake,
  ArrowRight,
} from "lucide-react";

interface CrmShortcutsProps {
  basePath: string;
}

export function CrmShortcuts({ basePath }: CrmShortcutsProps) {
  const links = [
    { href: `${basePath}/crm`, label: "CRM Dashboard", icon: LayoutDashboard },
    { href: `${basePath}/crm/contacts`, label: "Contacts", icon: Contact },
    { href: `${basePath}/crm/leads`, label: "Leads", icon: Target },
    { href: `${basePath}/crm/deals`, label: "Deals", icon: Handshake },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">CRM</CardTitle>
        <CardDescription>Sales pipeline and contacts</CardDescription>
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
