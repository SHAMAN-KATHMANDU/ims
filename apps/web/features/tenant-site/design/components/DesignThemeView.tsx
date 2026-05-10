"use client";

import { useState } from "react";
import { Palette, Zap, Layout, Type, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { useSiteConfig, useUpdateSiteConfig } from "../hooks/use-design";
import { getContrastRatioString } from "../lib/contrast-ratio";
import { defaultThemeTokens, type ThemeTokens } from "@repo/shared";

const FONT_FAMILIES = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
  { label: "Fraunces", value: "Fraunces, serif" },
  { label: "Space Mono", value: "'Space Mono', monospace" },
  { label: "System UI", value: "system-ui, sans-serif" },
];

export function DesignThemeView() {
  const configQuery = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();
  const { toast } = useToast();

  const [isDirty, setIsDirty] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeTokens | null>(null);

  // Fall back to the canonical defaults when the tenant's SiteConfig has no
  // themeTokens yet (e.g. they haven't applied a template, or first-run before
  // PR F's auto-publish lands). The editor then shows real fields the user can
  // tweak and save — far more useful than an empty "No theme data" stub.
  const persistedTheme = configQuery.data?.themeTokens as
    | ThemeTokens
    | undefined
    | null;
  const currentTheme: ThemeTokens =
    localTheme || persistedTheme || defaultThemeTokens();

  const handleSave = async (): Promise<void> => {
    if (!localTheme) return;
    try {
      await updateMutation.mutateAsync({
        themeTokens: localTheme as unknown as Record<string, unknown>,
      });
      setIsDirty(false);
      toast({ title: "Theme saved successfully" });
    } catch (error) {
      toast({
        title: "Failed to save theme",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleRevert = (): void => {
    setLocalTheme(null);
    setIsDirty(false);
  };

  const handleColorChange = (key: string, value: string): void => {
    if (!currentTheme) return;
    setLocalTheme((prev) => ({
      ...(prev || currentTheme),
      colors: {
        ...((prev || currentTheme).colors || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleTypographyChange = (
    key: keyof ThemeTokens["typography"],
    value: unknown,
  ): void => {
    if (!currentTheme) return;
    setLocalTheme((prev) => ({
      ...(prev || currentTheme),
      typography: {
        ...((prev || currentTheme).typography || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleSpacingChange = (
    key: keyof ThemeTokens["spacing"],
    value: unknown,
  ): void => {
    if (!currentTheme) return;
    setLocalTheme((prev) => ({
      ...(prev || currentTheme),
      spacing: {
        ...((prev || currentTheme).spacing || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleShapeChange = (
    key: keyof ThemeTokens["shape"],
    value: unknown,
  ): void => {
    if (!currentTheme) return;
    setLocalTheme((prev) => ({
      ...(prev || currentTheme),
      shape: {
        ...((prev || currentTheme).shape || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleMotionChange = (
    key: keyof ThemeTokens["motion"],
    value: unknown,
  ): void => {
    if (!currentTheme) return;
    setLocalTheme((prev) => ({
      ...(prev || currentTheme),
      motion: {
        ...((prev || currentTheme).motion || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading theme…
      </div>
    );
  }

  const colorKeys = Object.keys(currentTheme.colors) as Array<
    keyof typeof currentTheme.colors
  >;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design"
        description="Global tokens for your site theme."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!isDirty || updateMutation.isPending}
              onClick={handleRevert}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Revert
            </Button>
            <Button
              disabled={!isDirty || updateMutation.isPending}
              onClick={handleSave}
            >
              <Check className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving…" : "Save & publish"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Editors */}
        <div className="col-span-2 space-y-4">
          {/* Color Palette */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Brand Colors</h3>
            </div>

            <div className="space-y-2">
              {colorKeys.map((colorKey) => {
                const color = currentTheme.colors[colorKey] ?? "#000000";
                const contrastRatio = getContrastRatioString(
                  color,
                  currentTheme.colors.background || "#ffffff",
                );
                return (
                  <div
                    key={colorKey}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/30"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) =>
                        handleColorChange(colorKey, e.target.value)
                      }
                      className="h-8 w-8 rounded border border-border cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm capitalize font-medium block">
                        {colorKey}
                      </Label>
                      <code className="text-xs text-muted-foreground font-mono">
                        {color}
                      </code>
                    </div>
                    <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      Contrast: {contrastRatio}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Typography</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Heading font</Label>
                <Select
                  value={currentTheme.typography.heading.family}
                  onValueChange={(value) =>
                    handleTypographyChange("heading", {
                      ...currentTheme.typography.heading,
                      family: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Body font</Label>
                <Select
                  value={currentTheme.typography.body.family}
                  onValueChange={(value) =>
                    handleTypographyChange("body", {
                      ...currentTheme.typography.body,
                      family: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Heading Scale Ratio: {currentTheme.typography.scaleRatio}
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1.1"
                    max="1.5"
                    step="0.025"
                    value={currentTheme.typography.scaleRatio}
                    onChange={(e) =>
                      handleTypographyChange(
                        "scaleRatio",
                        parseFloat(e.target.value),
                      )
                    }
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <button
                    onClick={() => handleTypographyChange("scaleRatio", 1.125)}
                    className="px-2 py-1 rounded hover:bg-muted"
                  >
                    1.125
                  </button>
                  <button
                    onClick={() => handleTypographyChange("scaleRatio", 1.2)}
                    className="px-2 py-1 rounded hover:bg-muted"
                  >
                    1.2
                  </button>
                  <button
                    onClick={() => handleTypographyChange("scaleRatio", 1.25)}
                    className="px-2 py-1 rounded hover:bg-muted"
                  >
                    1.25
                  </button>
                  <button
                    onClick={() => handleTypographyChange("scaleRatio", 1.333)}
                    className="px-2 py-1 rounded hover:bg-muted"
                  >
                    1.333
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Base font size: {currentTheme.typography.baseSize}px
                </Label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={currentTheme.typography.baseSize}
                  onChange={(e) =>
                    handleTypographyChange("baseSize", parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Spacing */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Spacing & Layout</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">
                  Base unit: {currentTheme.spacing.unit}px
                </Label>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={currentTheme.spacing.unit}
                  onChange={(e) =>
                    handleSpacingChange("unit", parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Container width: {currentTheme.spacing.container}px
                </Label>
                <input
                  type="range"
                  min="640"
                  max="1600"
                  step="16"
                  value={currentTheme.spacing.container}
                  onChange={(e) =>
                    handleSpacingChange("container", parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Section spacing</Label>
                <div className="flex gap-2">
                  {(["compact", "balanced", "spacious"] as const).map(
                    (value) => (
                      <button
                        key={value}
                        onClick={() => handleSpacingChange("section", value)}
                        className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                          currentTheme.spacing.section === value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shape & Radius */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Shape</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Border radius</Label>
                <div className="flex gap-2 flex-wrap">
                  {(["sharp", "soft", "rounded"] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => handleShapeChange("radius", value)}
                      className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                        currentTheme.shape.radius === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Button style</Label>
                <div className="flex gap-2">
                  {(["solid", "outline", "pill"] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() =>
                        handleShapeChange(
                          "buttonStyle",
                          value as "solid" | "outline" | "pill",
                        )
                      }
                      className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                        currentTheme.shape.buttonStyle === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Motion */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Motion & Animation</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTheme.motion.enableAnimations}
                  onChange={(e) =>
                    handleMotionChange("enableAnimations", e.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Enable animations</span>
              </label>

              <div className="space-y-2">
                <Label className="text-sm">
                  Animation duration: {currentTheme.motion.duration}ms
                </Label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={currentTheme.motion.duration}
                  onChange={(e) =>
                    handleMotionChange("duration", parseInt(e.target.value))
                  }
                  className="w-full"
                  disabled={!currentTheme.motion.enableAnimations}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="col-span-1">
          <div className="sticky top-6 rounded-lg border border-border overflow-hidden bg-card">
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                Live Preview
              </div>
            </div>

            <div
              className="p-6 space-y-4"
              style={{
                backgroundColor: currentTheme.colors.background,
                color: currentTheme.colors.text,
                fontFamily: currentTheme.typography.body.family,
              }}
            >
              <div>
                <h2
                  className="text-lg font-bold mb-1"
                  style={{
                    fontFamily: currentTheme.typography.heading.family,
                  }}
                >
                  Design Preview
                </h2>
                <p
                  className="text-sm"
                  style={{ color: currentTheme.colors.muted }}
                >
                  Your theme applied in real-time.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className="px-3 py-2 text-xs font-medium rounded text-white"
                  style={{ backgroundColor: currentTheme.colors.primary }}
                >
                  Primary CTA
                </button>
                <button
                  className="px-3 py-2 text-xs font-medium rounded"
                  style={{
                    backgroundColor: "transparent",
                    border: `1px solid ${currentTheme.colors.border}`,
                    color: currentTheme.colors.text,
                  }}
                >
                  Secondary
                </button>
              </div>

              <div
                className="p-3 rounded space-y-2"
                style={{
                  backgroundColor: currentTheme.colors.surface,
                  border: `1px solid ${currentTheme.colors.border}`,
                }}
              >
                <div
                  className="text-xs font-mono"
                  style={{ color: currentTheme.colors.muted }}
                >
                  Card preview
                </div>
                <div
                  className="h-6 rounded"
                  style={{
                    backgroundColor: currentTheme.colors.accent,
                    opacity: 0.2,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
