"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  User,
  BadgeCheck,
  Handshake,
  ArrowRight,
  CheckCircle2,
  Zap,
  Loader2,
} from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useConvertLead } from "../../hooks/use-leads";
import type { Lead } from "../../services/lead.service";

type Phase = "preview" | "working" | "done";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * The hero interaction: 1 lead → company + contact + member + deal fan-out.
 * A right-side vaul drawer with preview → working → done phases. The actual
 * fan-out is transactional server-side (useConvertLead → POST /leads/:id/convert
 * which emits crm.lead.converted); this UI animates the result.
 */
export function ConvertLeadDrawer({
  lead,
  open,
  onOpenChange,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const convert = useConvertLead();
  const [phase, setPhase] = React.useState<Phase>("preview");
  const dealIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setPhase("preview");
      dealIdRef.current = null;
    }
  }, [open, lead?.id]);

  if (!lead) return null;

  const company = lead.companyName || "—";
  const nodes = [
    {
      icon: Building2,
      label: "Company",
      value: company,
      note: company === "—" ? "Skipped" : "New record",
    },
    {
      icon: User,
      label: "Contact",
      value: lead.name,
      note: `Owner · ${lead.assignedTo?.username ?? "—"}`,
    },
    {
      icon: BadgeCheck,
      label: "Member",
      value: lead.phone ? "Loyalty member" : "No phone",
      note: lead.phone ? "Find-or-create by phone" : "Skipped",
    },
    {
      icon: Handshake,
      label: "Deal",
      value: `${company} opportunity`,
      note: "New · OPEN",
    },
  ];

  const start = async () => {
    setPhase("working");
    try {
      const res = await convert.mutateAsync({ id: lead.id });
      dealIdRef.current = (res?.deal as { id?: string } | null)?.id ?? null;
      setPhase("done");
    } catch {
      // Global axios interceptor surfaces the error toast; return to preview.
      setPhase("preview");
    }
  };

  const viewDeal = () => {
    onOpenChange(false);
    if (dealIdRef.current) {
      router.push(`/${workspace}/crm/deals/${dealIdRef.current}`);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
        <DrawerHeader className="flex flex-row items-center gap-3 border-b text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <DrawerTitle>Convert lead</DrawerTitle>
            <DrawerDescription>
              {lead.name} · {company}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-5">
            {/* source node */}
            <div className="w-44 shrink-0 rounded-xl border bg-secondary p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lead
              </div>
              <Avatar className="mx-auto mt-3 h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-base text-primary-foreground">
                  {initials(lead.name)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2.5 text-sm font-semibold">{lead.name}</div>
              <div className="text-xs text-muted-foreground">{company}</div>
              <Badge variant="info" className="mt-2">
                {lead.status}
              </Badge>
            </div>

            {/* connector */}
            <div className="flex shrink-0 flex-col items-center gap-1 text-muted-foreground">
              {phase === "done" ? (
                <CheckCircle2 className="h-7 w-7 text-success" />
              ) : phase === "working" ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <ArrowRight className="h-7 w-7 text-primary" />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {phase === "done" ? "done" : "fan-out"}
              </span>
            </div>

            {/* result nodes */}
            <div className="grid flex-1 grid-cols-2 gap-2.5">
              {nodes.map((n, i) => {
                const Icon = n.icon;
                const shown = phase !== "preview";
                return (
                  <div
                    key={n.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-secondary p-3 transition-all duration-500",
                      shown ? "border-primary opacity-100" : "opacity-50",
                    )}
                    style={{
                      transitionDelay: `${i * 80}ms`,
                      transform: shown ? "translateX(0)" : "translateX(-8px)",
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {n.label}
                      </div>
                      <div className="truncate text-[13px] font-semibold">
                        {n.value}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {n.note}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {phase === "done" && (
            <div className="mt-5 flex animate-in fade-in-0 slide-in-from-bottom-2 items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-[13px] font-medium">
                Converted — 1 lead fanned out into linked records. Event{" "}
                <code className="font-mono text-xs">crm.lead.converted</code>{" "}
                published.
              </p>
            </div>
          )}
        </div>

        <DrawerFooter className="flex-row items-center justify-end gap-2.5 border-t bg-secondary">
          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={start}>
                <Zap className="h-[18px] w-[18px]" /> Convert lead
              </Button>
            </>
          )}
          {phase === "working" && (
            <Button disabled>
              <Loader2 className="h-[18px] w-[18px] animate-spin" /> Converting…
            </Button>
          )}
          {phase === "done" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button onClick={viewDeal} disabled={!dealIdRef.current}>
                View deal <ArrowRight className="h-[18px] w-[18px]" />
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
