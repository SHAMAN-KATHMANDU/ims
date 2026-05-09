"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

export function BillingTab() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Current plan
            </div>
            <div className="text-3xl font-semibold">
              $48{" "}
              <span className="text-sm text-muted-foreground font-normal">
                / month
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Renews Dec 14, 2026 · billed monthly
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Change plan</Button>
            <Button>Manage billing</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
          Usage this period
        </div>
        {[
          {
            label: "Bandwidth",
            value: "84.2 GB",
            limit: "of 500 GB",
            pct: 0.17,
          },
          {
            label: "Build minutes",
            value: "127",
            limit: "of unlimited",
            pct: 0,
          },
          {
            label: "Form submissions",
            value: "1,852",
            limit: "of 10,000",
            pct: 0.19,
          },
          { label: "Storage", value: "4.8 GB", limit: "of 50 GB", pct: 0.1 },
        ].map((item) => (
          <div
            key={item.label}
            className="space-y-2 pb-4 border-b last:border-0"
          >
            <div className="flex justify-between text-sm">
              <span>{item.label}</span>
              <span className="text-muted-foreground">
                {item.value} <span className="text-xs">{item.limit}</span>
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${item.pct * 100}%` }}
              />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
