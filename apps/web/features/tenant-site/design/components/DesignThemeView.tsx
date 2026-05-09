"use client";

import { useState } from "react";
import { Palette, Zap, Layout, Type, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { useSiteConfig, useUpdateSiteConfig } from "../hooks/use-design";
import type { ThemeTokens } from "@repo/shared";

export function DesignThemeView() {
  const configQuery = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();
  const { toast } = useToast();

  const [isDirty, setIsDirty] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeTokens | null>(null);

  const currentTheme =
    localTheme || (configQuery.data?.themeTokens as ThemeTokens | undefined);

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

  if (!currentTheme) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No theme data available.
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
              <h3 className="font-semibold text-sm">Colors</h3>
            </div>

            <div className="space-y-2">
              {colorKeys.map((colorKey) => (
                <div key={colorKey} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={currentTheme.colors[colorKey]}
                    onChange={(e) =>
                      handleColorChange(colorKey, e.target.value)
                    }
                    className="h-8 w-8 rounded border border-border cursor-pointer"
                  />
                  <Label className="min-w-20 text-sm capitalize">
                    {colorKey}
                  </Label>
                  <code className="text-xs text-muted-foreground font-mono flex-1">
                    {currentTheme.colors[colorKey]}
                  </code>
                </div>
              ))}
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
                <Input
                  value={currentTheme.typography.heading.family}
                  onChange={(e) =>
                    handleTypographyChange("heading", {
                      ...currentTheme.typography.heading,
                      family: e.target.value,
                    })
                  }
                  placeholder="e.g., Georgia, serif"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Body font</Label>
                <Input
                  value={currentTheme.typography.body.family}
                  onChange={(e) =>
                    handleTypographyChange("body", {
                      ...currentTheme.typography.body,
                      family: e.target.value,
                    })
                  }
                  placeholder="e.g., system-ui, sans-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Scale ratio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="2"
                    value={currentTheme.typography.scaleRatio}
                    onChange={(e) =>
                      handleTypographyChange(
                        "scaleRatio",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Base size (px)</Label>
                  <Input
                    type="number"
                    min="12"
                    max="24"
                    value={currentTheme.typography.baseSize}
                    onChange={(e) =>
                      handleTypographyChange(
                        "baseSize",
                        parseInt(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spacing */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Spacing</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Unit (px)</Label>
                <Input
                  type="number"
                  min="2"
                  max="16"
                  value={currentTheme.spacing.unit}
                  onChange={(e) =>
                    handleSpacingChange("unit", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Section spacing</Label>
                <Select
                  value={currentTheme.spacing.section}
                  onValueChange={(v) =>
                    handleSpacingChange(
                      "section",
                      v as "compact" | "balanced" | "spacious",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Container width (px)</Label>
                <Input
                  type="number"
                  min="640"
                  max="1600"
                  value={currentTheme.spacing.container}
                  onChange={(e) =>
                    handleSpacingChange("container", parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </div>

          {/* Shape */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Shape</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Border radius</Label>
                <Select
                  value={
                    typeof currentTheme.shape.radius === "number"
                      ? currentTheme.shape.radius.toString()
                      : currentTheme.shape.radius
                  }
                  onValueChange={(v) => {
                    const num = parseInt(v);
                    handleShapeChange("radius", isNaN(num) ? v : num);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sharp">Sharp</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="rounded">Rounded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Button style</Label>
                <Select
                  value={currentTheme.shape.buttonStyle}
                  onValueChange={(v) =>
                    handleShapeChange(
                      "buttonStyle",
                      v as "solid" | "outline" | "pill",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="pill">Pill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Motion */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Motion</h3>
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
                <span className="text-sm">Enable animations</span>
              </label>

              <div className="space-y-2">
                <Label className="text-sm">Duration (ms)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  value={currentTheme.motion.duration}
                  onChange={(e) =>
                    handleMotionChange("duration", parseInt(e.target.value))
                  }
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
