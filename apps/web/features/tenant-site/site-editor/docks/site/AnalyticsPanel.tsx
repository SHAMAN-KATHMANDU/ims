"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  useSiteAnalytics,
  useUpdateSiteAnalytics,
} from "../../../hooks/use-site-analytics";

const AnalyticsSchema = z.object({
  ga4MeasurementId: z.string().optional(),
  gtmContainerId: z.string().optional(),
  metaPixelId: z.string().optional(),
  consentMode: z.enum(["basic", "granted"]).optional(),
});

type AnalyticsFormInput = z.infer<typeof AnalyticsSchema>;

export function AnalyticsPanel() {
  const { toast } = useToast();
  const analyticsQuery = useSiteAnalytics();
  const updateMutation = useUpdateSiteAnalytics();

  const form = useForm<AnalyticsFormInput>({
    resolver: zodResolver(AnalyticsSchema),
    mode: "onBlur",
    defaultValues: {
      ga4MeasurementId: analyticsQuery.data?.ga4MeasurementId ?? "",
      gtmContainerId: analyticsQuery.data?.gtmContainerId ?? "",
      metaPixelId: analyticsQuery.data?.metaPixelId ?? "",
      consentMode: analyticsQuery.data?.consentMode ?? "basic",
    },
  });

  useEffect(() => {
    form.reset({
      ga4MeasurementId: analyticsQuery.data?.ga4MeasurementId ?? "",
      gtmContainerId: analyticsQuery.data?.gtmContainerId ?? "",
      metaPixelId: analyticsQuery.data?.metaPixelId ?? "",
      consentMode: analyticsQuery.data?.consentMode ?? "basic",
    });
  }, [analyticsQuery.data, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(values);
      toast({ title: "Analytics settings saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">Analytics</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* GA4 */}
          <div className="space-y-1.5">
            <Label htmlFor="ga4-id" className="text-sm font-medium">
              Google Analytics 4 ID
            </Label>
            <Input
              id="ga4-id"
              placeholder="G-XXXXXXXXXX"
              {...form.register("ga4MeasurementId")}
            />
            <p className="text-xs text-muted-foreground">
              Your GA4 measurement ID. Starts with &quot;G-&quot;.
            </p>
          </div>

          {/* GTM */}
          <div className="space-y-1.5">
            <Label htmlFor="gtm-id" className="text-sm font-medium">
              Google Tag Manager ID
            </Label>
            <Input
              id="gtm-id"
              placeholder="GTM-XXXXXXX"
              {...form.register("gtmContainerId")}
            />
            <p className="text-xs text-muted-foreground">
              Your GTM container ID. Starts with &quot;GTM-&quot;.
            </p>
          </div>

          {/* Meta Pixel */}
          <div className="space-y-1.5">
            <Label htmlFor="meta-pixel" className="text-sm font-medium">
              Meta Pixel ID
            </Label>
            <Input
              id="meta-pixel"
              placeholder="123456789"
              {...form.register("metaPixelId")}
            />
            <p className="text-xs text-muted-foreground">
              Your Meta Pixel ID for Facebook/Instagram tracking.
            </p>
          </div>

          {/* Consent mode */}
          <div className="space-y-1.5">
            <Label htmlFor="consent-mode" className="text-sm font-medium">
              Consent mode
            </Label>
            <Controller
              control={form.control}
              name="consentMode"
              render={({ field }) => (
                <Select
                  value={field.value ?? "basic"}
                  onValueChange={(v) =>
                    field.onChange(v as "basic" | "granted")
                  }
                >
                  <SelectTrigger id="consent-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      Basic (cookie consent required)
                    </SelectItem>
                    <SelectItem value="granted">
                      Granted (no consent needed)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Controls whether tracking waits for user consent.
            </p>
          </div>

          <div className="flex items-center justify-end border-t border-border pt-4">
            <Button type="submit" disabled={updateMutation.isPending} size="sm">
              {updateMutation.isPending ? "Saving…" : "Save analytics"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
