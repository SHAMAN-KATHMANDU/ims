"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useRequestAddOn, type AddOnType } from "@/hooks/useUsage";
import { useToast } from "@/hooks/useToast";
import { AlertTriangle, ArrowUpCircle, Plus } from "lucide-react";
import Link from "next/link";

interface PlanLimitPayload {
  error: string;
  resource: string;
  current: number;
  limit: number;
  addOns: number;
  effectiveLimit: number;
  message: string;
  canPurchaseAddOn: boolean;
  addOnType: string;
}

const RESOURCE_LABELS: Record<string, string> = {
  users: "Users",
  products: "Products",
  locations: "Locations",
  members: "Members",
  categories: "Categories",
  contacts: "Contacts",
};

export function PlanLimitDialog() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<PlanLimitPayload | null>(null);
  const requestAddOn = useRequestAddOn();
  const { toast } = useToast();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "";

  const handleEvent = useCallback((e: Event) => {
    const detail = (e as CustomEvent<PlanLimitPayload>).detail;
    setPayload(detail);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener("plan-limit-reached", handleEvent);
    return () => window.removeEventListener("plan-limit-reached", handleEvent);
  }, [handleEvent]);

  const handleRequestAddOn = async () => {
    if (!payload) return;
    try {
      await requestAddOn.mutateAsync({
        type: payload.addOnType as AddOnType,
        quantity: 1,
      });
      toast({
        title: "Add-on request submitted. Your administrator will review it.",
      });
      setOpen(false);
    } catch {
      // Error already handled by the service
    }
  };

  if (!payload) return null;

  const label = RESOURCE_LABELS[payload.resource] ?? payload.resource;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>{label} Limit Reached</DialogTitle>
          </div>
          <DialogDescription>{payload.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current usage</span>
              <span className="font-medium">
                {payload.current} / {payload.effectiveLimit}
              </span>
            </div>
            <Progress value={100} className="h-3" />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">Plan limit: {payload.limit}</Badge>
            {payload.addOns > 0 && (
              <Badge variant="outline">Add-ons: +{payload.addOns}</Badge>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {payload.canPurchaseAddOn && (
            <Button
              onClick={handleRequestAddOn}
              disabled={requestAddOn.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {requestAddOn.isPending ? "Requesting..." : "Request Add-On"}
            </Button>
          )}
          {workspace && (
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/${workspace}/settings/usage`}>
                <ArrowUpCircle className="h-4 w-4" />
                View Usage & Plans
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
