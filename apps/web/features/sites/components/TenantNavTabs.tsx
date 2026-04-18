"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEnvFeatureFlag, EnvFeature } from "@/features/flags";

interface TenantNavTabsProps {
  workspace: string;
  tenantId: string;
  active: "edit" | "domains" | "website";
}

type TabDef = {
  key: TenantNavTabsProps["active"];
  label: string;
  suffix: string;
  flag?: EnvFeature;
};

const TABS: TabDef[] = [
  { key: "edit", label: "General", suffix: "edit" },
  {
    key: "domains",
    label: "Domains",
    suffix: "domains",
    flag: EnvFeature.TENANT_WEBSITES,
  },
  {
    key: "website",
    label: "Website",
    suffix: "website",
    flag: EnvFeature.TENANT_WEBSITES,
  },
];

export function TenantNavTabs({
  workspace,
  tenantId,
  active,
}: TenantNavTabsProps) {
  const tenantWebsitesEnabled = useEnvFeatureFlag(EnvFeature.TENANT_WEBSITES);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.flag === EnvFeature.TENANT_WEBSITES) return tenantWebsitesEnabled;
    return true;
  });

  return (
    <nav className="flex gap-1 border-b" aria-label="Tenant sections">
      {visibleTabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/${workspace}/platform/tenants/${tenantId}/${tab.suffix}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
