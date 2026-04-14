"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  useSiteTemplates,
  usePickSiteTemplate,
  type SiteTemplate,
} from "../hooks/use-tenant-site";

interface SiteTemplatePickerProps {
  activeTemplateId: string | null;
  disabled?: boolean;
}

function templatePrimary(template: SiteTemplate): string {
  const branding = template.defaultBranding as {
    colors?: { primary?: string };
  } | null;
  return branding?.colors?.primary ?? "#ddd";
}

export function SiteTemplatePicker({
  activeTemplateId,
  disabled,
}: SiteTemplatePickerProps) {
  const { toast } = useToast();
  const templatesQuery = useSiteTemplates();
  const pickMutation = usePickSiteTemplate();
  const [confirm, setConfirm] = useState<SiteTemplate | null>(null);

  const handlePick = async (resetBranding: boolean) => {
    if (!confirm) return;
    try {
      await pickMutation.mutateAsync({
        templateSlug: confirm.slug,
        resetBranding,
      });
      toast({
        title: "Template applied",
        description: confirm.name,
      });
      setConfirm(null);
    } catch (error) {
      toast({
        title: "Failed to apply template",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            Pick the look for your storefront. Switching templates keeps your
            branding unless you choose to reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading templates…
            </p>
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templatesQuery.data.map((t) => {
                const isActive = activeTemplateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfirm(t)}
                    disabled={disabled || pickMutation.isPending}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-lg border text-left transition-all",
                      "hover:border-foreground/50 disabled:cursor-not-allowed disabled:opacity-60",
                      isActive && "border-foreground ring-2 ring-foreground/20",
                    )}
                  >
                    <div
                      className="h-24 w-full"
                      style={{ background: templatePrimary(t) }}
                    />
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t.name}</span>
                        {isActive && (
                          <CheckCircle2 className="h-4 w-4 text-foreground" />
                        )}
                      </div>
                      {t.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                      {t.category && (
                        <Badge
                          variant="secondary"
                          className="mt-auto self-start text-[10px]"
                        >
                          {t.category}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No templates available.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {confirm?.name}?</DialogTitle>
            <DialogDescription>
              Choose whether to keep your current branding customizations or
              reset them to the {confirm?.name} defaults.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={pickMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePick(false)}
              disabled={pickMutation.isPending}
            >
              Keep my branding
            </Button>
            <Button
              onClick={() => handlePick(true)}
              disabled={pickMutation.isPending}
            >
              {pickMutation.isPending ? "Applying…" : "Reset to defaults"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
