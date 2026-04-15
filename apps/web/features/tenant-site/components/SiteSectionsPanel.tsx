"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";

/**
 * Section-toggle panel.
 *
 * Tenants tick a checkbox per renderable section. The editor reads the
 * current `features` JSON off the loaded SiteConfig, shows an on/off
 * switch for every known section, and writes the merged result back via
 * PATCH /sites/config on save. Unknown keys under `features` are left
 * alone — a template can introduce its own toggle without this component
 * needing to know about it (it would just render under "template-specific"
 * with no UI). Today the editor only exposes the canonical set.
 *
 * The canonical key set mirrors apps/tenant-site/lib/sections.ts.
 */

type SectionKey =
  | "hero"
  | "categories"
  | "products"
  | "bento"
  | "story"
  | "trust"
  | "articles"
  | "contact"
  | "newsletter"
  | "testimonials"
  | "lookbook";

const SECTIONS: Array<{
  key: SectionKey;
  label: string;
  description: string;
}> = [
  {
    key: "hero",
    label: "Hero",
    description: "Top-of-page brand name + tagline + CTA.",
  },
  {
    key: "categories",
    label: "Categories",
    description: "Shop-by-category chip strip or tile grid.",
  },
  {
    key: "products",
    label: "Featured products",
    description: "Main product grid on the homepage.",
  },
  {
    key: "bento",
    label: "Bento showcase",
    description:
      "Asymmetric product grid — big feature + 4 supporting tiles. Used by Dark + Gallery templates.",
  },
  {
    key: "story",
    label: "Story split",
    description: "Side-by-side image + narrative block.",
  },
  {
    key: "trust",
    label: "Trust strip",
    description: "Stats band: years in business, guarantees, etc.",
  },
  {
    key: "articles",
    label: "Featured blog posts",
    description: "Latest journal posts teaser.",
  },
  {
    key: "newsletter",
    label: "Newsletter band",
    description: "Email capture — decorative form for now.",
  },
  {
    key: "contact",
    label: "Contact block",
    description: "Email / phone / address on the homepage.",
  },
  {
    key: "testimonials",
    label: "Testimonials",
    description: "Customer quote band (not wired in any template yet).",
  },
  {
    key: "lookbook",
    label: "Lookbook",
    description: "Large editorial tiles. Used by Luxury.",
  },
];

function coerceBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

const DEFAULTS: Record<SectionKey, boolean> = {
  hero: true,
  categories: true,
  products: true,
  bento: false,
  story: false,
  trust: false,
  articles: true,
  contact: false,
  newsletter: false,
  testimonials: false,
  lookbook: false,
};

export function SiteSectionsPanel({
  features,
  disabled,
}: {
  features: Record<string, unknown> | null;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const updateMutation = useUpdateSiteConfig();

  const [state, setState] = useState<Record<SectionKey, boolean>>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const f = features ?? {};
    const next = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as SectionKey[]) {
      next[k] = coerceBool((f as Record<string, unknown>)[k], DEFAULTS[k]);
    }
    setState(next);
    setDirty(false);
  }, [features]);

  const toggle = (key: SectionKey) => {
    setState((s) => ({ ...s, [key]: !s[key] }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      // Merge with any unknown keys already in `features` so template-
      // specific toggles the editor doesn't know about survive a save.
      const merged: Record<string, unknown> = { ...(features ?? {}) };
      for (const [k, v] of Object.entries(state)) {
        merged[k] = v;
      }
      await updateMutation.mutateAsync({ features: merged });
      toast({ title: "Sections saved" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sections</CardTitle>
        <CardDescription>
          Turn individual homepage sections on or off. Changes go live within a
          few seconds of saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div
              key={s.key}
              className="flex items-start gap-3 rounded-md border border-border p-3"
            >
              <Switch
                id={`section-${s.key}`}
                checked={state[s.key]}
                onCheckedChange={() => toggle(s.key)}
                disabled={disabled}
              />
              <div className="space-y-1">
                <Label
                  htmlFor={`section-${s.key}`}
                  className="text-sm font-medium"
                >
                  {s.label}
                </Label>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
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
            {updateMutation.isPending ? "Saving…" : "Save sections"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
