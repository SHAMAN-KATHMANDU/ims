"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import {
  SeoFormSchema,
  type SeoFormInput,
  seoFromJson,
  seoToJson,
} from "../../../validation";
import {
  useUpdateSiteConfig,
  useSiteConfig,
} from "../../../hooks/use-tenant-site";

const TITLE_LIMIT = 55;
const DESCRIPTION_LIMIT = 155;

export function SeoPanel() {
  const { toast } = useToast();
  const siteQuery = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();

  const form = useForm<SeoFormInput>({
    resolver: zodResolver(SeoFormSchema),
    mode: "onBlur",
    defaultValues: seoFromJson(siteQuery.data?.seo ?? null),
  });

  useEffect(() => {
    form.reset(seoFromJson(siteQuery.data?.seo ?? null));
  }, [siteQuery.data?.seo, form]);

  const watched = useWatch({ control: form.control });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({ seo: seoToJson(values) });
      toast({ title: "SEO settings saved" });
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
        <span className="text-sm font-semibold text-foreground">SEO</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Page title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-title" className="text-sm font-medium">
                Page title
              </Label>
              <CharCounter value={watched.title ?? ""} limit={TITLE_LIMIT} />
            </div>
            <Input
              id="seo-title"
              placeholder="Your brand — short description"
              {...form.register("title")}
            />
            <p className="text-xs text-muted-foreground">
              Appears in browser tabs and as the main link on search results.
            </p>
          </div>

          {/* Meta description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-desc" className="text-sm font-medium">
                Meta description
              </Label>
              <CharCounter
                value={watched.description ?? ""}
                limit={DESCRIPTION_LIMIT}
              />
            </div>
            <Input
              id="seo-desc"
              placeholder="A brief description of your site"
              {...form.register("description")}
            />
            <p className="text-xs text-muted-foreground">
              The snippet shown under your title in search results.
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-keywords" className="text-sm font-medium">
              Keywords (optional)
            </Label>
            <Input
              id="seo-keywords"
              placeholder="keyword1, keyword2, keyword3"
              {...form.register("keywords")}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Mostly for legacy purposes.
            </p>
          </div>

          {/* OG image */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-og" className="text-sm font-medium">
              Social preview image (og:image)
            </Label>
            <Input
              id="seo-og"
              placeholder="https://…"
              {...form.register("ogImage")}
            />
            <p className="text-xs text-muted-foreground">
              1200×630 image for social sharing. Falls back to your logo.
            </p>
          </div>

          {/* SERP Preview */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="text-xs font-semibold text-foreground">
              Search preview
            </div>
            <div className="text-xs space-y-1">
              <div className="text-blue-600 dark:text-blue-400 truncate">
                {watched.title || "Your site"}
              </div>
              <div className="text-xs text-green-700 dark:text-green-400">
                example.com
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {watched.description || "Description appears here…"}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-border pt-4">
            <Button type="submit" disabled={updateMutation.isPending} size="sm">
              {updateMutation.isPending ? "Saving…" : "Save SEO"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CharCounter({ value, limit }: { value: string; limit: number }) {
  const len = value.length;
  const status =
    len > limit
      ? "text-destructive"
      : len > limit * 0.9
        ? "text-amber-600"
        : "text-muted-foreground/60";
  return (
    <span className={`text-xs ${status}`}>
      {len}/{limit}
    </span>
  );
}
