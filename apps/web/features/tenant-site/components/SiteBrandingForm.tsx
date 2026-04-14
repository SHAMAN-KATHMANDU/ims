"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerField } from "@/components/media/MediaPickerField";
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
  BrandingFormSchema,
  type BrandingFormInput,
  brandingFromJson,
  brandingToJson,
} from "../validation";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";

interface SiteBrandingFormProps {
  branding: Record<string, unknown> | null;
  disabled?: boolean;
}

export function SiteBrandingForm({
  branding,
  disabled,
}: SiteBrandingFormProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateSiteConfig();

  const form = useForm<BrandingFormInput>({
    resolver: zodResolver(BrandingFormSchema),
    mode: "onBlur",
    defaultValues: brandingFromJson(branding),
  });

  useEffect(() => {
    form.reset(brandingFromJson(branding));
  }, [branding, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({ branding: brandingToJson(values) });
      toast({ title: "Branding saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const theme = form.watch("theme");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          How your storefront looks to visitors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Display name</Label>
            <Input
              id="brand-name"
              placeholder="Acme Furniture"
              disabled={disabled}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-tagline">Tagline</Label>
            <Input
              id="brand-tagline"
              placeholder="Handcrafted since 1998"
              disabled={disabled}
              {...form.register("tagline")}
            />
            {form.formState.errors.tagline && (
              <p className="text-sm text-destructive">
                {form.formState.errors.tagline.message}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="brand-logo">Logo</Label>
            <Controller
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <MediaPickerField
                  id="brand-logo"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={disabled}
                  helperText="PNG or SVG, ideally with a transparent background."
                />
              )}
            />
            {form.formState.errors.logoUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.logoUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="brand-favicon">Favicon</Label>
            <Controller
              control={form.control}
              name="faviconUrl"
              render={({ field }) => (
                <MediaPickerField
                  id="brand-favicon"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={disabled}
                  previewSize={32}
                  helperText="Square image, 32×32 or 64×64 PNG recommended."
                />
              )}
            />
            {form.formState.errors.faviconUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.faviconUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-primary">Primary color</Label>
            <Input
              id="brand-primary"
              placeholder="#1E40AF"
              disabled={disabled}
              {...form.register("primaryColor")}
            />
            {form.formState.errors.primaryColor && (
              <p className="text-sm text-destructive">
                {form.formState.errors.primaryColor.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-accent">Accent color</Label>
            <Input
              id="brand-accent"
              placeholder="#F59E0B"
              disabled={disabled}
              {...form.register("accentColor")}
            />
            {form.formState.errors.accentColor && (
              <p className="text-sm text-destructive">
                {form.formState.errors.accentColor.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-theme">Theme</Label>
            <Select
              value={theme ?? "light"}
              onValueChange={(v) =>
                form.setValue("theme", v as "light" | "dark")
              }
              disabled={disabled}
            >
              <SelectTrigger id="brand-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-end sm:col-span-2">
            <Button
              type="submit"
              disabled={disabled || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save branding"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
