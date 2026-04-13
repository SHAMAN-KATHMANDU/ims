"use client";

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
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
        <CardDescription>
          Defaults used for search engines and social previews.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="seo-title">Title</Label>
            <Input
              id="seo-title"
              placeholder="Acme — Handcrafted furniture"
              disabled={disabled}
              {...form.register("title")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="seo-description">Description</Label>
            <Input
              id="seo-description"
              placeholder="We build furniture that lasts generations."
              disabled={disabled}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="seo-keywords">Keywords</Label>
            <Input
              id="seo-keywords"
              placeholder="furniture, handmade, kathmandu"
              disabled={disabled}
              {...form.register("keywords")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
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
          </div>

          <div className="flex items-end justify-end sm:col-span-2">
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
  );
}
