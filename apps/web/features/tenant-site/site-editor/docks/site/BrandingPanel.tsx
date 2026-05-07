"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  BrandingFormSchema,
  type BrandingFormInput,
  brandingFromJson,
  brandingToJson,
} from "../../../validation";
import {
  useUpdateSiteConfig,
  useSiteConfig,
} from "../../../hooks/use-tenant-site";

export function BrandingPanel() {
  const { toast } = useToast();
  const siteQuery = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();

  const form = useForm<BrandingFormInput>({
    resolver: zodResolver(BrandingFormSchema),
    mode: "onBlur",
    defaultValues: brandingFromJson(siteQuery.data?.branding ?? null),
  });

  useEffect(() => {
    form.reset(brandingFromJson(siteQuery.data?.branding ?? null));
  }, [siteQuery.data?.branding, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        branding: brandingToJson(values),
      });
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">Branding</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Info banner */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-800 dark:text-blue-200">
            <p>
              Brand identity (logo, name, tagline) is managed in{" "}
              <a
                href="../settings/business-profile"
                className="font-medium underline"
              >
                Settings → Business profile
              </a>
            </p>
          </div>

          {/* Theme selector */}
          <div className="space-y-1.5">
            <Label htmlFor="branding-theme" className="text-sm font-medium">
              Theme mode
            </Label>
            <Controller
              control={form.control}
              name="theme"
              render={({ field }) => (
                <Select
                  value={field.value ?? "light"}
                  onValueChange={(v) => field.onChange(v as "light" | "dark")}
                >
                  <SelectTrigger id="branding-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Primary color */}
          <ColorField
            label="Primary color"
            id="branding-primary"
            placeholder="#111111"
            {...form.register("primaryColor")}
            value={form.watch("primaryColor") ?? ""}
            help="CTA buttons, links, brand accent."
          />

          {/* Secondary color */}
          <ColorField
            label="Secondary color"
            id="branding-secondary"
            placeholder="#444444"
            {...form.register("secondaryColor")}
            value={form.watch("secondaryColor") ?? ""}
            help="Hover states, supporting brand color."
          />

          {/* Accent color */}
          <ColorField
            label="Accent color"
            id="branding-accent"
            placeholder="#F5F5F5"
            {...form.register("accentColor")}
            value={form.watch("accentColor") ?? ""}
            help="Secondary CTAs, badges, highlights."
          />

          <div className="flex items-center justify-end border-t border-border pt-4">
            <Button type="submit" disabled={updateMutation.isPending} size="sm">
              {updateMutation.isPending ? "Saving…" : "Save branding"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ColorField({
  label,
  id,
  placeholder,
  value,
  help,
  ...inputProps
}: {
  label: string;
  id: string;
  placeholder: string;
  value: string;
  help: string;
  [key: string]: unknown;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div
          className="h-10 w-10 shrink-0 rounded-md border border-border"
          style={{ background: value || "transparent" }}
          aria-hidden
        />
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </div>
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}
