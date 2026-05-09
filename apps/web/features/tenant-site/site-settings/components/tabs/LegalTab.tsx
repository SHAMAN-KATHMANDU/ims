"use client";

import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";

const LEGAL_PAGES = [
  { id: "p1", name: "Privacy policy", updated: "2 weeks ago" },
  { id: "p2", name: "Terms of service", updated: "2 weeks ago" },
  { id: "p3", name: "Accessibility statement", updated: "2 weeks ago" },
  { id: "p4", name: "Cookie policy", updated: "2 weeks ago" },
];

export function LegalTab() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Legal pages</h3>
        <div className="space-y-2">
          {LEGAL_PAGES.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1">{page.name}</span>
              <span className="text-xs text-muted-foreground">
                updated {page.updated}
              </span>
              <Button size="sm" variant="ghost">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="border-t pt-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">Cookie banner</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">
                Show cookie banner to EU/UK visitors
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">
                Require explicit opt-in for analytics
              </span>
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
