"use client";

/**
 * SEO form — metadata editor with a live Google-style SERP preview and
 * character counters. Split into two cards: "Metadata" (the form itself)
 * and "Search preview" (what a tenant's listing would look like on a
 * search results page). Watching the form values with RHF's `watch()`
 * keeps the preview reactive without extra state.
 *
 * Character limits are Google's recommended soft caps — 55 for titles and
 * 155 for descriptions. Exceeding them warns but doesn't block the save.
 */

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { useToast } from "@/hooks/useToast";
import {
  SeoFormSchema,
  type SeoFormInput,
  seoFromJson,
  seoToJson,
} from "../validation";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";

interface SiteSeoFormProps {
  seo: Record<string, unknown> | null;
  disabled?: boolean;
}

const TITLE_LIMIT = 55;
const DESCRIPTION_LIMIT = 155;

export function SiteSeoForm({ seo, disabled }: SiteSeoFormProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateSiteConfig();

  const form = useForm<SeoFormInput>({
    resolver: zodResolver(SeoFormSchema),
    mode: "onBlur",
    defaultValues: seoFromJson(seo),
  });

  useEffect(() => {
    form.reset(seoFromJson(seo));
  }, [seo, form]);

  const watched = useWatch({ control: form.control });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({ seo: seoToJson(values) });
      toast({ title: "SEO saved" });
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <CardDescription>
            Defaults used for search engines and social previews. Per-page
            metadata (blog posts, products) overrides these when set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-title">Page title</Label>
                <CharCounter value={watched.title ?? ""} limit={TITLE_LIMIT} />
              </div>
              <Input
                id="seo-title"
                placeholder="Acme — Handcrafted furniture"
                disabled={disabled}
                {...form.register("title")}
              />
              <p className="text-[11px] text-muted-foreground">
                Appears in browser tabs and as the big blue link on Google.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-description">Meta description</Label>
                <CharCounter
                  value={watched.description ?? ""}
                  limit={DESCRIPTION_LIMIT}
                />
              </div>
              <Input
                id="seo-description"
                placeholder="We build furniture that lasts generations."
                disabled={disabled}
                {...form.register("description")}
              />
              <p className="text-[11px] text-muted-foreground">
                The snippet shown under your title in search results.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="seo-keywords">Keywords</Label>
              <Input
                id="seo-keywords"
                placeholder="furniture, handmade, kathmandu"
                disabled={disabled}
                {...form.register("keywords")}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated. Most modern search engines ignore this, but
                it&apos;s kept for legacy tooling.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="seo-og">Social preview image (og:image)</Label>
              <Input
                id="seo-og"
                placeholder="https://…"
                disabled={disabled}
                {...form.register("ogImage")}
              />
              {form.formState.errors.ogImage && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.ogImage.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                A 1200×630 image shown when your link is shared on social media.
                Defaults to your logo if blank.
              </p>
            </div>

            <div className="flex items-end justify-end border-t border-border pt-4 sm:col-span-2">
              <Button
                type="submit"
                disabled={disabled || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save SEO"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search preview</CardTitle>
          <CardDescription>
            How your home page might appear in a Google search result.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SerpPreview
            title={watched.title ?? "Your site"}
            description={
              watched.description ?? "Add a description above to see it here."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CharCounter({ value, limit }: { value: string; limit: number }) {
  const len = value?.length ?? 0;
  const over = len > limit;
  return (
    <span
      className={`text-[11px] tabular-nums ${
        over ? "font-medium text-amber-600" : "text-muted-foreground"
      }`}
    >
      {len} / {limit}
    </span>
  );
}

function SerpPreview({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const displayTitle = title || "Your site";
  const displayDesc = description || "—";
  return (
    <div className="max-w-2xl rounded-md border border-border bg-background p-4 font-sans">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted/40 text-[9px]">
          🌐
        </div>
        <span>your-site.com</span>
        <span>›</span>
        <span className="text-muted-foreground/80">home</span>
      </div>
      <h3 className="mt-1 text-xl text-blue-700 hover:underline dark:text-blue-400">
        {displayTitle}
      </h3>
      <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
        https://your-site.com
      </p>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
        {displayDesc}
      </p>
    </div>
  );
}
