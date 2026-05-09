"use client";

import { useState, useMemo } from "react";
import {
  Palette,
  Zap,
  Layout,
  Type,
  RotateCcw,
  Check,
  AlertCircle,
} from "lucide-react";
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
import { getContrastRatio, getContrastScore } from "../utils/color-utils";

const GOOGLE_FONTS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Playfair Display", value: "Playfair Display, serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
  { label: "Fraunces", value: "Fraunces, serif" },
  { label: "Space Mono", value: "Space Mono, monospace" },
  { label: "System UI", value: "system-ui, sans-serif" },
  { label: "Custom...", value: "custom" },
];

const COLOR_LABEL_MAP: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  surface: "Surface",
  text: "Text",
  muted: "Muted",
  border: "Border",
  ring: "Ring",
  onPrimary: "On Primary",
};

export function DesignThemeView() {
  const configQuery = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();
  const { toast } = useToast();

  const [isDirty, setIsDirty] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeTokens | null>(null);
  const [showCustomFont, setShowCustomFont] = useState<
    "heading" | "body" | null
  >(null);

  const currentTheme =
    localTheme || (configQuery.data?.themeTokens as ThemeTokens | undefined);

  const contrastRatio = useMemo(() => {
    if (!currentTheme) return 0;
    return getContrastRatio(
      currentTheme.colors.text,
      currentTheme.colors.background,
    );
  }, [currentTheme?.colors.text, currentTheme?.colors.background]);

  const handleSave = async (): Promise<void> => {
    if (!localTheme) return;
    try {
      await updateMutation.mutateAsync({
        themeTokens: localTheme as unknown as Record<string, unknown>,
      });
      setIsDirty(false);
      setShowCustomFont(null);
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
    setShowCustomFont(null);
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
        description="Customize your site's global theme."
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

            <div className="space-y-3">
              {colorKeys.map((colorKey) => {
                const label = COLOR_LABEL_MAP[colorKey] || colorKey;
                return (
                  <div key={colorKey} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={currentTheme.colors[colorKey]}
                        onChange={(e) =>
                          handleColorChange(colorKey, e.target.value)
                        }
                        className="h-8 w-8 rounded border border-border cursor-pointer"
                      />
                      <div className="flex-1">
                        <Label className="text-sm">{label}</Label>
                        <code className="text-xs text-muted-foreground font-mono">
                          {currentTheme.colors[colorKey]}
                        </code>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Contrast ratio */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    Text contrast ratio
                  </span>
                </div>
                <div className="text-sm mt-2">
                  <span className="font-mono">
                    {contrastRatio.toFixed(2)}:1
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {getContrastScore(contrastRatio) === "good" &&
                      "✓ AAA compliant"}
                    {getContrastScore(contrastRatio) === "ok" &&
                      "✓ AA compliant"}
                    {getContrastScore(contrastRatio) === "poor" &&
                      "✗ Low contrast"}
                  </span>
                </div>
              </div>
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
                {!showCustomFont || showCustomFont !== "heading" ? (
                  <Select
                    value={
                      GOOGLE_FONTS.find(
                        (f) =>
                          f.value === currentTheme.typography.heading.family,
                      )?.value || "custom"
                    }
                    onValueChange={(v) => {
                      if (v === "custom") {
                        setShowCustomFont("heading");
                      } else {
                        handleTypographyChange("heading", {
                          ...currentTheme.typography.heading,
                          family: v,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOOGLE_FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={currentTheme.typography.heading.family}
                    onChange={(e) =>
                      handleTypographyChange("heading", {
                        ...currentTheme.typography.heading,
                        family: e.target.value,
                      })
                    }
                    placeholder="e.g., Georgia, serif"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Body font</Label>
                {!showCustomFont || showCustomFont !== "body" ? (
                  <Select
                    value={
                      GOOGLE_FONTS.find(
                        (f) => f.value === currentTheme.typography.body.family,
                      )?.value || "custom"
                    }
                    onValueChange={(v) => {
                      if (v === "custom") {
                        setShowCustomFont("body");
                      } else {
                        handleTypographyChange("body", {
                          ...currentTheme.typography.body,
                          family: v,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOOGLE_FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={currentTheme.typography.body.family}
                    onChange={(e) =>
                      handleTypographyChange("body", {
                        ...currentTheme.typography.body,
                        family: e.target.value,
                      })
                    }
                    placeholder="e.g., system-ui, sans-serif"
                    autoFocus
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">
                    Scale ratio
                    <span className="text-xs text-muted-foreground ml-1">
                      ({currentTheme.typography.scaleRatio.toFixed(2)})
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    {[1.125, 1.2, 1.25, 1.333].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() =>
                          handleTypographyChange("scaleRatio", ratio)
                        }
                        className={`flex-1 px-2 py-1 text-xs rounded border transition ${
                          Math.abs(currentTheme.typography.scaleRatio - ratio) <
                          0.01
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {ratio.toFixed(3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Base size
                    <span className="text-xs text-muted-foreground ml-1">
                      ({currentTheme.typography.baseSize}px)
                    </span>
                  </Label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={currentTheme.typography.baseSize}
                    onChange={(e) =>
                      handleTypographyChange(
                        "baseSize",
                        parseInt(e.target.value),
                      )
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spacing & Layout */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Spacing & Layout</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">
                  Spacing unit
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currentTheme.spacing.unit}px)
                  </span>
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
                <Label className="text-sm">Section spacing</Label>
                <div className="flex gap-2">
                  {(["compact", "balanced", "spacious"] as const).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleSpacingChange("section", val)}
                      className={`flex-1 px-3 py-2 text-xs rounded border transition ${
                        currentTheme.spacing.section === val
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Container width
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currentTheme.spacing.container}px)
                  </span>
                </Label>
                <input
                  type="range"
                  min="1024"
                  max="1600"
                  step="32"
                  value={currentTheme.spacing.container}
                  onChange={(e) =>
                    handleSpacingChange("container", parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Shape & Buttons */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Shape & Buttons</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Border radius</Label>
                <div className="flex gap-2">
                  {(["sharp", "soft", "rounded"] as const).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleShapeChange("radius", val)}
                      className={`flex-1 px-3 py-2 text-xs rounded border transition ${
                        currentTheme.shape.radius === val
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
                {typeof currentTheme.shape.radius === "number" && (
                  <Input
                    type="number"
                    min="0"
                    max="48"
                    value={currentTheme.shape.radius}
                    onChange={(e) =>
                      handleShapeChange("radius", parseInt(e.target.value))
                    }
                    placeholder="Custom radius (px)"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Button style</Label>
                <div className="flex gap-2">
                  {(["solid", "outline", "pill"] as const).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleShapeChange("buttonStyle", val)}
                      className={`flex-1 px-3 py-2 text-xs rounded border transition ${
                        currentTheme.shape.buttonStyle === val
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {val.charAt(0).toUpperCase() + val.slice(1)}
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
                <Label className="text-sm">
                  Duration
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currentTheme.motion.duration}ms)
                  </span>
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
                    fontSize: `${
                      currentTheme.typography.baseSize *
                      Math.pow(currentTheme.typography.scaleRatio, 2)
                    }px`,
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
                  className="px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: currentTheme.colors.primary,
                    borderRadius:
                      typeof currentTheme.shape.radius === "number"
                        ? `${currentTheme.shape.radius}px`
                        : {
                            sharp: "0",
                            soft: "6px",
                            rounded: "12px",
                          }[currentTheme.shape.radius],
                  }}
                >
                  Primary CTA
                </button>
                <button
                  className="px-3 py-2 text-xs font-medium rounded transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "transparent",
                    border: `1px solid ${currentTheme.colors.border}`,
                    color: currentTheme.colors.text,
                    borderRadius:
                      typeof currentTheme.shape.radius === "number"
                        ? `${currentTheme.shape.radius}px`
                        : {
                            sharp: "0",
                            soft: "6px",
                            rounded: "12px",
                          }[currentTheme.shape.radius],
                  }}
                >
                  Secondary
                </button>
              </div>

              <div
                className="p-3 space-y-2"
                style={{
                  backgroundColor: currentTheme.colors.surface,
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius:
                    typeof currentTheme.shape.radius === "number"
                      ? `${currentTheme.shape.radius}px`
                      : {
                          sharp: "0",
                          soft: "6px",
                          rounded: "12px",
                        }[currentTheme.shape.radius],
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
                    borderRadius:
                      typeof currentTheme.shape.radius === "number"
                        ? `${currentTheme.shape.radius}px`
                        : {
                            sharp: "0",
                            soft: "6px",
                            rounded: "12px",
                          }[currentTheme.shape.radius],
                  }}
                />
              </div>

              <div
                className="text-xs p-2 rounded"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  color: currentTheme.colors.text,
                  borderRadius:
                    typeof currentTheme.shape.radius === "number"
                      ? `${currentTheme.shape.radius}px`
                      : {
                          sharp: "0",
                          soft: "6px",
                          rounded: "12px",
                        }[currentTheme.shape.radius],
                }}
              >
                Accent element
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
