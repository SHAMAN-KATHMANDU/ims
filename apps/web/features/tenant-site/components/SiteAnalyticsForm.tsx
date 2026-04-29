"use client";

/**
 * Analytics settings form — lets tenant admins wire up GA4, GTM, and/or
 * Meta Pixel without touching code. Scripts are injected server-side by
 * the tenant-site app only on published, indexable pages; preview routes
 * and noindex pages are always skipped.
 *
 * Consent Mode v2 is honoured: "basic" (the default) sets all storage
 * grants to "denied" until the visitor accepts a cookie banner;
 * "granted" pre-grants all categories (only appropriate where local law
 * doesn't require explicit consent, e.g. no-cookie-law jurisdictions).
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  AnalyticsFormSchema,
  type AnalyticsFormInput,
  analyticsFromJson,
  analyticsToJson,
} from "../validation";
import {
  useSiteAnalytics,
  useUpdateSiteAnalytics,
} from "../hooks/use-tenant-site";

export function SiteAnalyticsForm() {
  const { toast } = useToast();
  const analyticsQuery = useSiteAnalytics();
  const updateMutation = useUpdateSiteAnalytics();

  const form = useForm<AnalyticsFormInput>({
    resolver: zodResolver(AnalyticsFormSchema),
    mode: "onBlur",
    defaultValues: analyticsFromJson(null),
  });

  // Sync form when remote data arrives (or changes after a save)
  useEffect(() => {
    if (analyticsQuery.data) {
      form.reset(
        analyticsFromJson(
          analyticsQuery.data as unknown as Record<string, unknown>,
        ),
      );
    }
  }, [analyticsQuery.data, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(
        analyticsToJson(values) as Parameters<
          typeof updateMutation.mutateAsync
        >[0],
      );
      toast({ title: "Analytics saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const isLoading = analyticsQuery.isLoading;
  const disabled = isLoading || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tracker IDs</CardTitle>
          <CardDescription>
            Add your analytics and tag manager IDs. Scripts are injected only on
            published, publicly-indexable pages — never on preview routes. Leave
            a field blank to skip that tracker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GA4 */}
            <div className="space-y-1.5">
              <Label htmlFor="analytics-ga4">
                Google Analytics 4 — Measurement ID
              </Label>
              <Input
                id="analytics-ga4"
                placeholder="G-XXXXXXXXXX"
                disabled={disabled}
                {...form.register("ga4MeasurementId")}
              />
              {form.formState.errors.ga4MeasurementId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.ga4MeasurementId.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Found in Google Analytics → Admin → Data streams → your stream →
                Measurement ID.
              </p>
            </div>

            {/* GTM */}
            <div className="space-y-1.5">
              <Label htmlFor="analytics-gtm">
                Google Tag Manager — Container ID
              </Label>
              <Input
                id="analytics-gtm"
                placeholder="GTM-XXXXXX"
                disabled={disabled}
                {...form.register("gtmContainerId")}
              />
              {form.formState.errors.gtmContainerId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.gtmContainerId.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Found in Google Tag Manager → Admin → Container settings →
                Container ID.
              </p>
            </div>

            {/* Meta Pixel */}
            <div className="space-y-1.5">
              <Label htmlFor="analytics-pixel">Meta Pixel ID</Label>
              <Input
                id="analytics-pixel"
                placeholder="123456789012"
                disabled={disabled}
                {...form.register("metaPixelId")}
              />
              {form.formState.errors.metaPixelId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.metaPixelId.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Found in Meta Events Manager → your pixel → Settings → Pixel ID.
              </p>
            </div>

            {/* Consent Mode */}
            <div className="space-y-1.5">
              <Label htmlFor="analytics-consent">Google Consent Mode v2</Label>
              <Select
                disabled={disabled}
                value={form.watch("consentMode") ?? "basic"}
                onValueChange={(v) =>
                  form.setValue(
                    "consentMode",
                    v as AnalyticsFormInput["consentMode"],
                    { shouldDirty: true },
                  )
                }
              >
                <SelectTrigger id="analytics-consent">
                  <SelectValue placeholder="Select consent mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    Basic (denied by default — cookie banner required)
                  </SelectItem>
                  <SelectItem value="granted">
                    Granted (pre-granted — only where no consent law applies)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                "Basic" signals &quot;denied&quot; for all Google storage grants
                until the visitor accepts your cookie banner. Use "Granted" only
                in jurisdictions without explicit-consent requirements.
              </p>
            </div>

            <div className="flex items-end justify-end border-t border-border pt-4">
              <Button type="submit" disabled={disabled}>
                {updateMutation.isPending ? "Saving…" : "Save analytics"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[13px] text-muted-foreground">
          <p>
            Scripts are rendered server-side in{" "}
            <code className="rounded bg-muted px-1 text-xs">&lt;head&gt;</code>{" "}
            using Next.js{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {'<Script strategy="afterInteractive">'}
            </code>
            , so they load after the page is interactive without blocking paint.
          </p>
          <p>
            Scripts are <strong>never</strong> injected on{" "}
            <code className="rounded bg-muted px-1 text-xs">/preview/*</code>{" "}
            routes or pages marked as <em>noindex</em>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
