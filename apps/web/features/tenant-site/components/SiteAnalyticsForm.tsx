"use client";

/**
 * Analytics form — lets tenant admins save their GA4, GTM, and Meta Pixel
 * tracker IDs. Validation enforces the canonical ID formats before the API
 * is called, so the tenant can't accidentally store a malformed ID that
 * would silently break script injection.
 *
 * Scripts are injected in the tenant-site layout ONLY on published sites.
 * The editor preview (/preview/*) is always excluded, even if IDs are set.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useUpdateSiteAnalytics } from "../hooks/use-tenant-site";
import type { SiteAnalytics } from "../services/tenant-site.service";

interface SiteAnalyticsFormProps {
  analytics: SiteAnalytics | null | undefined;
  disabled?: boolean;
}

export function SiteAnalyticsForm({
  analytics,
  disabled,
}: SiteAnalyticsFormProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateSiteAnalytics();

  const form = useForm<AnalyticsFormInput>({
    resolver: zodResolver(AnalyticsFormSchema),
    mode: "onBlur",
    defaultValues: analyticsFromJson(
      analytics as Record<string, unknown> | null,
    ),
  });

  useEffect(() => {
    form.reset(analyticsFromJson(analytics as Record<string, unknown> | null));
  }, [analytics, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(analyticsToJson(values));
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
    <Card>
      <CardHeader>
        <CardTitle>Analytics & Tracking</CardTitle>
        <CardDescription>
          Tracker IDs are injected into your published site only — they never
          appear in the editor preview.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="ga4MeasurementId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Analytics 4 Measurement ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="G-XXXXXXXXXX"
                      disabled={disabled}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Found in GA4 → Admin → Data Streams → Web stream details.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gtmContainerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Tag Manager Container ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="GTM-XXXXXX"
                      disabled={disabled}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Found in GTM → Admin → Container settings. GTM injects the
                    GA4 snippet for you — don&apos;t set both unless you manage
                    them separately.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metaPixelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Pixel ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456789012"
                      disabled={disabled}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Found in Meta Events Manager → Pixels → Your pixel → Details.
                    Must be a 6–20 digit number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Consent Mode</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? "basic"}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select consent mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">
                        Basic — fire analytics, honour consent signals
                      </SelectItem>
                      <SelectItem value="granted">
                        Granted — full consent already obtained
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Google Consent Mode v2 signal sent with each GA4 / GTM hit.
                    Use &quot;Basic&quot; unless your site has an explicit cookie
                    consent banner that has already obtained full consent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-end justify-end border-t border-border pt-4">
              <Button
                type="submit"
                disabled={disabled || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save Analytics"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
