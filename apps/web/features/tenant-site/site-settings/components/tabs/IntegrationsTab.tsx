"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

const INTEGRATIONS = [
  {
    id: "resy",
    name: "Resy",
    description: "Reservations & guest management",
    connected: true,
    color: "oklch(0.55 0.18 25)",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Newsletter + audience sync",
    connected: true,
    color: "oklch(0.85 0.15 90)",
  },
  {
    id: "square",
    name: "Square",
    description: "POS + payments + product sync",
    connected: true,
    color: "oklch(0.4 0 0)",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Direct payments for events & gift cards",
    connected: true,
    color: "oklch(0.55 0.2 270)",
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    description: "Site analytics",
    connected: true,
    color: "oklch(0.65 0.18 50)",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    description: "Marketing automation",
    connected: false,
    color: "oklch(0.5 0.12 150)",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Notify channel on form submissions",
    connected: false,
    color: "oklch(0.55 0.2 320)",
  },
];

export function IntegrationsTab() {
  const { toast } = useToast();

  const handleConnect = (name: string) => {
    toast({
      title: `${name} connection would open here (stubbed)`,
    });
  };

  return (
    <Card className="overflow-hidden">
      {INTEGRATIONS.map((integration, idx) => (
        <div
          key={integration.id}
          className={`px-4 py-3 grid grid-cols-[36px_1fr_110px_90px] gap-3 items-center ${
            idx > 0 ? "border-t" : ""
          } hover:bg-muted/30 transition-colors`}
        >
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: integration.color }}
          />
          <div>
            <div className="text-sm font-medium">{integration.name}</div>
            <div className="text-xs text-muted-foreground">
              {integration.description}
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded ${
              integration.connected
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {integration.connected ? "Connected" : "Not connected"}
          </span>
          <Button
            size="sm"
            variant={integration.connected ? "outline" : "default"}
            onClick={() =>
              handleConnect(integration.connected ? "Configure" : "Connect")
            }
          >
            {integration.connected ? "Configure" : "Connect"}
          </Button>
        </div>
      ))}
    </Card>
  );
}
