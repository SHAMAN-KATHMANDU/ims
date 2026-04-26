"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import {
  BrandingFormSchema,
  type BrandingFormInput,
  brandingFromJson,
  brandingToJson,
} from "../validation";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";
import { FontPicker } from "./FontPicker";

/**
 * Tabbed branding editor (Phase C.5 rewrite).
 *
 * Four tabs: Identity / Colors / Typography / Layout. The form schema
 * covers the full design-token surface that the tenant-site renderer
 * started consuming in C.2, so anything a template reads via `var(...)`
 * is reachable from this editor.
 *
 * Every field is optional — an empty field falls back to the template's
 * `defaultBranding` values, which in turn fall back to the `:root`
 * defaults in `apps/tenant-site/app/globals.css`. A blank form is still
 * a valid form.
 */

interface SiteBrandingFormProps {
  branding: Record<string, unknown> | null;
  disabled?: boolean;
}

const COLOR_FIELDS: Array<{
  name: keyof BrandingFormInput;
  label: string;
  help: string;
  placeholder: string;
}> = [
  {
    name: "primaryColor",
    label: "Primary",
    help: "CTA buttons, links, brand accent.",
    placeholder: "#111111",
  },
  {
    name: "secondaryColor",
    label: "Secondary",
    help: "Hover states, supporting brand color.",
    placeholder: "#444444",
  },
  {
    name: "accentColor",
    label: "Accent",
    help: "Secondary CTAs, badges, highlights.",
    placeholder: "#F5F5F5",
  },
  {
    name: "backgroundColor",
    label: "Background",
    help: "Page background.",
    placeholder: "#FFFFFF",
  },
  {
    name: "surfaceColor",
    label: "Surface",
    help: "Card and panel backgrounds.",
    placeholder: "#FAFAFA",
  },
  {
    name: "textColor",
    label: "Text",
    help: "Body text color.",
    placeholder: "#111111",
  },
  {
    name: "mutedColor",
    label: "Muted",
    help: "Secondary text, captions, eyebrows.",
    placeholder: "#6B7280",
  },
  {
    name: "borderColor",
    label: "Border",
    help: "Hairlines, dividers, card borders.",
    placeholder: "#E5E5E5",
  },
  {
    name: "ringColor",
    label: "Focus ring",
    help: "Keyboard focus outline.",
    placeholder: "#111111",
  },
];

function ColorField({
  form,
  field,
  disabled,
}: {
  form: ReturnType<typeof useForm<BrandingFormInput>>;
  field: (typeof COLOR_FIELDS)[number];
  disabled?: boolean;
}) {
  const id = `brand-${field.name}`;
  const error = form.formState.errors[field.name];
  const value = (form.watch(field.name) as string) ?? "";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {field.label}
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
          placeholder={field.placeholder}
          disabled={disabled}
          {...form.register(field.name)}
        />
      </div>
      <p className="text-xs text-muted-foreground">{field.help}</p>
      {error && (
        <p className="text-xs text-destructive">
          {String(error.message ?? "Invalid value")}
        </p>
      )}
    </div>
  );
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

  const values = form.watch();

  // Live preview chip — shows the current color + font picks in a tiny
  // sample card so the editor can see their tokens without leaving the
  // page. Falls back to the :root defaults for anything blank.
  const previewStyle = useMemo(() => {
    const s: Record<string, string> = {};
    if (values.primaryColor) s["--preview-primary"] = values.primaryColor;
    if (values.backgroundColor)
      s["--preview-background"] = values.backgroundColor;
    if (values.textColor) s["--preview-text"] = values.textColor;
    if (values.accentColor) s["--preview-accent"] = values.accentColor;
    if (values.borderColor) s["--preview-border"] = values.borderColor;
    if (values.headingFont)
      s["--preview-heading"] = `"${values.headingFont}", serif`;
    return s;
  }, [values]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Every setting here drives a CSS custom property on your tenant-site.
          Blank fields fall back to the template&apos;s defaults.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="identity" className="space-y-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
            </TabsList>

            {/* ---------- Identity ---------- */}
            <TabsContent value="identity" className="space-y-4">
              {/* Info banner — identity fields now live in Business profile */}
              <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  Business identity (logo, contact, address, tax IDs) is managed
                  in{" "}
                  <a
                    href="../settings/business-profile"
                    className="font-medium underline underline-offset-2"
                  >
                    Settings → Business profile
                  </a>
                  . Changes there appear on your site automatically.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-theme">Theme</Label>
                <Controller
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "light"}
                      onValueChange={(v) =>
                        field.onChange(v as "light" | "dark")
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger id="brand-theme" className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Sets <code>data-theme</code> on &lt;html&gt;. Individual color
                  tokens below still override the theme defaults.
                </p>
              </div>
            </TabsContent>

            {/* ---------- Colors ---------- */}
            <TabsContent value="colors" className="space-y-6">
              <div
                className="rounded-md border border-border p-4 text-sm"
                style={{
                  background: (values.backgroundColor as string) || undefined,
                  color: (values.textColor as string) || undefined,
                }}
              >
                <div
                  style={{
                    fontFamily: previewStyle["--preview-heading"],
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: (values.textColor as string) || undefined,
                  }}
                >
                  Your brand name
                </div>
                <p
                  style={{
                    color: (values.mutedColor as string) || undefined,
                    fontSize: "0.85rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  This strip shows how your color token picks will render.
                </p>
                <span
                  className="inline-block rounded px-3 py-1.5 text-xs"
                  style={{
                    background: (values.primaryColor as string) || undefined,
                    color: (values.backgroundColor as string) || undefined,
                  }}
                >
                  Shop now
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {COLOR_FIELDS.map((f) => (
                  <ColorField
                    key={f.name}
                    form={form}
                    field={f}
                    disabled={disabled}
                  />
                ))}
              </div>
            </TabsContent>

            {/* ---------- Typography ---------- */}
            <TabsContent value="typography" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand-heading-font">Heading font</Label>
                  <Controller
                    control={form.control}
                    name="headingFont"
                    render={({ field }) => (
                      <FontPicker
                        id="brand-heading-font"
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v || undefined)}
                        placeholder="Inter (default)"
                        disabled={disabled}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to h1–h6.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-body-font">Body font</Label>
                  <Controller
                    control={form.control}
                    name="bodyFont"
                    render={({ field }) => (
                      <FontPicker
                        id="brand-body-font"
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v || undefined)}
                        placeholder="Inter (default)"
                        disabled={disabled}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to paragraphs, buttons, inputs.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-display-font">
                    Display font (optional)
                  </Label>
                  <Controller
                    control={form.control}
                    name="displayFont"
                    render={({ field }) => (
                      <FontPicker
                        id="brand-display-font"
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v || undefined)}
                        placeholder="Playfair Display (default)"
                        disabled={disabled}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Oversized hero / section-title font. Falls back to heading
                    when blank.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-scale-ratio">Type scale</Label>
                  <Controller
                    control={form.control}
                    name="scaleRatio"
                    render={({ field }) => (
                      <Select
                        value={
                          field.value === undefined ? "" : String(field.value)
                        }
                        onValueChange={(v) =>
                          field.onChange(v === "" ? undefined : Number(v))
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger id="brand-scale-ratio">
                          <SelectValue placeholder="Template default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.125">
                            1.125 — Major second (tight)
                          </SelectItem>
                          <SelectItem value="1.2">1.2 — Minor third</SelectItem>
                          <SelectItem value="1.25">
                            1.25 — Major third
                          </SelectItem>
                          <SelectItem value="1.333">
                            1.333 — Perfect fourth
                          </SelectItem>
                          <SelectItem value="1.414">
                            1.414 — Augmented fourth
                          </SelectItem>
                          <SelectItem value="1.5">
                            1.5 — Perfect fifth (loud)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Modular scale ratio between heading levels.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-base-font">Base font size</Label>
                  <Input
                    id="brand-base-font"
                    type="number"
                    min={12}
                    max={24}
                    step={1}
                    placeholder="16"
                    disabled={disabled}
                    {...form.register("baseFontSize", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Base font size in pixels. 14–20 is typical.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ---------- Layout ---------- */}
            <TabsContent value="layout" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand-spacing-base">Spacing unit (px)</Label>
                  <Input
                    id="brand-spacing-base"
                    type="number"
                    min={2}
                    max={12}
                    step={1}
                    placeholder="4"
                    disabled={disabled}
                    {...form.register("spacingBase", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Base grid unit. Most templates use 4.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-section-padding">Section padding</Label>
                  <Controller
                    control={form.control}
                    name="sectionPadding"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) =>
                          field.onChange(
                            v === ""
                              ? undefined
                              : (v as "compact" | "balanced" | "spacious"),
                          )
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger id="brand-section-padding">
                          <SelectValue placeholder="Template default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">
                            Compact (2.5rem)
                          </SelectItem>
                          <SelectItem value="balanced">
                            Balanced (4rem)
                          </SelectItem>
                          <SelectItem value="spacious">
                            Spacious (6rem)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vertical rhythm between sections.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-radius">Corner radius</Label>
                  <Controller
                    control={form.control}
                    name="radius"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) =>
                          field.onChange(
                            v === ""
                              ? undefined
                              : (v as "sharp" | "soft" | "rounded"),
                          )
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger id="brand-radius">
                          <SelectValue placeholder="Template default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sharp">Sharp (0)</SelectItem>
                          <SelectItem value="soft">Soft (6px)</SelectItem>
                          <SelectItem value="rounded">
                            Rounded (14px)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Buttons, cards, inputs.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end border-t border-border pt-4">
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
