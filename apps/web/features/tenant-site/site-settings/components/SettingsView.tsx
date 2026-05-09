"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { GeneralTab } from "./tabs/GeneralTab";
import { TeamTab } from "./tabs/TeamTab";
import { BillingTab } from "./tabs/BillingTab";
import { IntegrationsTab } from "./tabs/IntegrationsTab";
import { APITab } from "./tabs/APITab";
import { LegalTab } from "./tabs/LegalTab";
import { AdvancedTab } from "./tabs/AdvancedTab";

type TabKey =
  | "general"
  | "team"
  | "billing"
  | "integrations"
  | "api"
  | "legal"
  | "advanced";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "general", label: "General" },
    { key: "team", label: "Team & permissions" },
    { key: "billing", label: "Billing" },
    { key: "integrations", label: "Integrations" },
    { key: "api", label: "API & webhooks" },
    { key: "legal", label: "Legal" },
    { key: "advanced", label: "Advanced" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />

      <div className="grid grid-cols-[200px_1fr] gap-6">
        {/* Sidebar nav */}
        <div className="flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm rounded text-left transition-colors ${
                activeTab === tab.key
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "team" && <TeamTab />}
          {activeTab === "billing" && <BillingTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "api" && <APITab />}
          {activeTab === "legal" && <LegalTab />}
          {activeTab === "advanced" && <AdvancedTab />}
        </div>
      </div>
    </div>
  );
}
