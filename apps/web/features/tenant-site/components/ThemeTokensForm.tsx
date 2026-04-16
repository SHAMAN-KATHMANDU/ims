"use client";

/**
 * ThemeTokensForm — structured design token editor.
 *
 * Five internal tabs map to the ThemeTokens shape from @repo/shared:
 *   Colors      — 9 tokens + onPrimary via hex input + color picker
 *   Typography  — heading/body font family + scaleRatio + baseSize
 *   Spacing     — unit + section preset + container width
 *   Shape       — radius preset/number + buttonStyle
 *   Motion      — enableAnimations toggle + duration slider
 *
 * Reads the current `themeTokens` from the SiteConfig response; writes
 * the full object back via PUT /sites/config { themeTokens: {...} }.
 * When no themeTokens exist yet, seeds from `defaultThemeTokens()`.
 */

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  defaultThemeTokens,
  ThemeTokensSchema,
  type ThemeTokens,
  type ThemeColors,
} from "@repo/shared";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";

interface ThemeTokensFormProps {
  themeTokens: Record<string, unknown> | null | undefined;
  disabled?: boolean;
}

const COLOR_FIELDS: Array<{
  key: keyof ThemeColors;
  label: string;
}> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted" },
  { key: "border", label: "Border" },
  { key: "ring", label: "Focus ring" },
  { key: "onPrimary", label: "On primary" },
];

const HEX_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

function parseTokens(
  raw: Record<string, unknown> | null | undefined,
): ThemeTokens {
  const parsed = ThemeTokensSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultThemeTokens();
}

export function ThemeTokensForm({
  themeTokens: raw,
  disabled,
}: ThemeTokensFormProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateSiteConfig();
  const [tokens, setTokens] = useState<ThemeTokens>(() => parseTokens(raw));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTokens(parseTokens(raw));
    setDirty(false);
  }, [raw]);

  const update = <K extends keyof ThemeTokens>(
    key: K,
    value: ThemeTokens[K],
  ) => {
    setTokens((t) => ({ ...t, [key]: value }));
    setDirty(true);
  };

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setTokens((t) => ({
      ...t,
      colors: { ...t.colors, [key]: value },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        themeTokens: tokens as unknown as Record<string, unknown>,
      });
      toast({ title: "Theme saved" });
      setDirty(false);
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setTokens(defaultThemeTokens());
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme tokens</CardTitle>
        <CardDescription>
          Fine-grained control over your site&apos;s visual identity. Changes
          apply to every block and template section that reads CSS variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="colors">
          <TabsList>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="spacing">Spacing</TabsTrigger>
            <TabsTrigger value="shape">Shape</TabsTrigger>
            <TabsTrigger value="motion">Motion</TabsTrigger>
          </TabsList>

          {/* Colors */}
          <TabsContent value="colors" className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.colors[key] ?? "#000000"}
                    onChange={(e) => updateColor(key, e.target.value)}
                    disabled={disabled}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border p-0.5"
                    aria-label={label}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={tokens.colors[key] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (HEX_RE.test(v) || v === "") updateColor(key, v);
                      }}
                      disabled={disabled}
                      className={`h-8 font-mono text-xs ${
                        tokens.colors[key] && !HEX_RE.test(tokens.colors[key]!)
                          ? "border-red-500"
                          : ""
                      }`}
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1">
              <Label className="text-xs">Color mode</Label>
              <Select
                value={tokens.mode}
                onValueChange={(v) => update("mode", v as ThemeTokens["mode"])}
              >
                <SelectTrigger className="w-40" disabled={disabled}>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (system)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Typography */}
          <TabsContent value="typography" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Heading font</Label>
                <Input
                  value={tokens.typography.heading.family}
                  onChange={(e) =>
                    update("typography", {
                      ...tokens.typography,
                      heading: {
                        ...tokens.typography.heading,
                        family: e.target.value,
                      },
                    })
                  }
                  disabled={disabled}
                  placeholder="system-ui, sans-serif"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Body font</Label>
                <Input
                  value={tokens.typography.body.family}
                  onChange={(e) =>
                    update("typography", {
                      ...tokens.typography,
                      body: {
                        ...tokens.typography.body,
                        family: e.target.value,
                      },
                    })
                  }
                  disabled={disabled}
                  placeholder="system-ui, sans-serif"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Type scale ratio ({tokens.typography.scaleRatio.toFixed(2)})
                </Label>
                <input
                  type="range"
                  min="1.05"
                  max="1.5"
                  step="0.01"
                  value={tokens.typography.scaleRatio}
                  onChange={(e) =>
                    update("typography", {
                      ...tokens.typography,
                      scaleRatio: Number(e.target.value),
                    })
                  }
                  disabled={disabled}
                  className="w-full"
                  aria-label="Type scale ratio"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Base font size ({tokens.typography.baseSize}px)
                </Label>
                <Input
                  type="number"
                  min={12}
                  max={24}
                  value={tokens.typography.baseSize}
                  onChange={(e) =>
                    update("typography", {
                      ...tokens.typography,
                      baseSize: Number(e.target.value),
                    })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </TabsContent>

          {/* Spacing */}
          <TabsContent value="spacing" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  Base unit ({tokens.spacing.unit}px)
                </Label>
                <Input
                  type="number"
                  min={2}
                  max={16}
                  value={tokens.spacing.unit}
                  onChange={(e) =>
                    update("spacing", {
                      ...tokens.spacing,
                      unit: Number(e.target.value),
                    })
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Section padding</Label>
                <Select
                  value={tokens.spacing.section}
                  onValueChange={(v) =>
                    update("spacing", {
                      ...tokens.spacing,
                      section: v as ThemeTokens["spacing"]["section"],
                    })
                  }
                >
                  <SelectTrigger disabled={disabled}>
                    <SelectValue placeholder="Select padding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Container width ({tokens.spacing.container}px)
                </Label>
                <Input
                  type="number"
                  min={640}
                  max={1600}
                  step={40}
                  value={tokens.spacing.container}
                  onChange={(e) =>
                    update("spacing", {
                      ...tokens.spacing,
                      container: Number(e.target.value),
                    })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </TabsContent>

          {/* Shape */}
          <TabsContent value="shape" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Border radius</Label>
                <Select
                  value={String(tokens.shape.radius)}
                  onValueChange={(v) => {
                    const asNum = Number(v);
                    update("shape", {
                      ...tokens.shape,
                      radius: Number.isFinite(asNum)
                        ? asNum
                        : (v as "sharp" | "soft" | "rounded"),
                    });
                  }}
                >
                  <SelectTrigger disabled={disabled}>
                    <SelectValue placeholder="Select radius" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sharp">Sharp (0)</SelectItem>
                    <SelectItem value="soft">Soft (6px)</SelectItem>
                    <SelectItem value="rounded">Rounded (12px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Button style</Label>
                <Select
                  value={tokens.shape.buttonStyle}
                  onValueChange={(v) =>
                    update("shape", {
                      ...tokens.shape,
                      buttonStyle: v as ThemeTokens["shape"]["buttonStyle"],
                    })
                  }
                >
                  <SelectTrigger disabled={disabled}>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="pill">Pill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Motion */}
          <TabsContent value="motion" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm">Enable animations</span>
              <Switch
                checked={tokens.motion.enableAnimations}
                onCheckedChange={(v) =>
                  update("motion", { ...tokens.motion, enableAnimations: v })
                }
                disabled={disabled}
                aria-label="Enable animations"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Transition duration ({tokens.motion.duration}ms)
              </Label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={tokens.motion.duration}
                onChange={(e) =>
                  update("motion", {
                    ...tokens.motion,
                    duration: Number(e.target.value),
                  })
                }
                disabled={disabled}
                className="w-full"
                aria-label="Animation duration"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
          >
            Reset to defaults
          </Button>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={disabled || !dirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save theme"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
