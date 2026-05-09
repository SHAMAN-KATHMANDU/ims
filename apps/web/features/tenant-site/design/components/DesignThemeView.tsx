"use client";

import { useState } from "react";
import { Palette, Zap, Layout, Type, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Slider } from "@/components/ui/slider";
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

interface ThemeTokens {
  colors?: Record<string, string>;
  typography?: {
    fontFamily?: string;
    baseFontSize?: number;
  };
  layout?: {
    containerWidth?: string;
    sectionSpacing?: string;
    borderRadius?: number;
  };
  motion?: {
    enableTransitions?: boolean;
  };
}

export function DesignThemeView() {
  const configQuery = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();
  const { toast } = useToast();

  const [isDirty, setIsDirty] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeTokens>(() => {
    const currentConfig = configQuery.data;
    return (currentConfig?.themeTokens as ThemeTokens) || {};
  });

  const handleSave = async (): Promise<void> => {
    try {
      await updateMutation.mutateAsync({
        themeTokens: localTheme as Record<string, unknown>,
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
    const currentConfig = configQuery.data;
    setLocalTheme((currentConfig?.themeTokens as ThemeTokens) || {});
    setIsDirty(false);
  };

  const handleColorChange = (key: string, value: string): void => {
    setLocalTheme((prev) => ({
      ...prev,
      colors: {
        ...(prev.colors || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleFontChange = (family: string): void => {
    setLocalTheme((prev) => ({
      ...prev,
      typography: {
        ...(prev.typography || {}),
        fontFamily: family,
      },
    }));
    setIsDirty(true);
  };

  const handleLayoutChange = (key: string, value: string | number): void => {
    setLocalTheme((prev) => ({
      ...prev,
      layout: {
        ...(prev.layout || {}),
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
              <h3 className="font-semibold text-sm">Color Palette</h3>
            </div>

            <div className="space-y-2">
              {[
                "primary",
                "secondary",
                "accent",
                "background",
                "foreground",
              ].map((colorKey) => (
                <div key={colorKey} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={
                      (localTheme.colors?.[colorKey] as string) || "#000000"
                    }
                    onChange={(e) =>
                      handleColorChange(colorKey, e.target.value)
                    }
                    className="h-8 w-8 rounded border border-border cursor-pointer"
                  />
                  <Label className="min-w-24 text-sm capitalize">
                    {colorKey}
                  </Label>
                  <code className="text-xs text-muted-foreground font-mono">
                    {(localTheme.colors?.[colorKey] as string) || "#000000"}
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

            <div className="space-y-2">
              <Label className="text-sm">Font family</Label>
              <Select
                value={localTheme.typography?.fontFamily || "sans"}
                onValueChange={handleFontChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Söhne (Sans)</SelectItem>
                  <SelectItem value="serif">Tiempos (Serif)</SelectItem>
                  <SelectItem value="mono">JetBrains Mono</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Layout */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Layout</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Container width</Label>
                <Select
                  value={
                    (localTheme.layout?.containerWidth as string) || "1280px"
                  }
                  onValueChange={(v) => handleLayoutChange("containerWidth", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024px">1024px</SelectItem>
                    <SelectItem value="1200px">1200px</SelectItem>
                    <SelectItem value="1280px">1280px</SelectItem>
                    <SelectItem value="1440px">1440px</SelectItem>
                    <SelectItem value="full">Full width</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Section spacing</Label>
                <Select
                  value={
                    (localTheme.layout?.sectionSpacing as string) || "generous"
                  }
                  onValueChange={(v) => handleLayoutChange("sectionSpacing", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tight">Tight</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="generous">Generous</SelectItem>
                    <SelectItem value="editorial">Editorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Border radius</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 2, 4, 8, 12].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleLayoutChange("borderRadius", r)}
                      className={`h-8 text-xs font-mono transition-colors ${
                        (localTheme.layout?.borderRadius as number) === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                      style={{ borderRadius: `${r}px` }}
                    >
                      {r}
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

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localTheme.motion?.enableTransitions ?? true}
                onChange={(e) => {
                  setLocalTheme((prev) => ({
                    ...prev,
                    motion: {
                      ...(prev.motion || {}),
                      enableTransitions: e.target.checked,
                    },
                  }));
                  setIsDirty(true);
                }}
                className="h-4 w-4"
              />
              <span className="text-sm">Enable smooth transitions</span>
            </label>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="col-span-1">
          <div className="sticky top-6 rounded-lg border border-border overflow-hidden bg-card">
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                Live Theme Preview
              </div>
            </div>

            <div className="p-6 space-y-4" style={getPreviewStyles(localTheme)}>
              <div>
                <h2 className="text-lg font-serif font-bold mb-1">
                  Design Preview
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your theme applied in real-time.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded">
                  Primary CTA
                </button>
                <button className="px-3 py-2 text-xs font-medium border border-border text-foreground rounded">
                  Secondary
                </button>
              </div>

              <div className="p-3 rounded border border-border bg-muted/50 space-y-2">
                <div className="text-xs font-mono text-muted-foreground uppercase">
                  Card preview
                </div>
                <div className="h-6 rounded bg-accent opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPreviewStyles(theme: ThemeTokens): React.CSSProperties {
  return {
    fontFamily: theme.typography?.fontFamily || "system-ui",
    backgroundColor: (theme.colors?.background as string) || "transparent",
    color: (theme.colors?.foreground as string) || "inherit",
  };
}
