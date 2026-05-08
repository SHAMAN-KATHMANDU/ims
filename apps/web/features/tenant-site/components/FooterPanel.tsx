"use client";

/**
 * FooterPanel — tenant-facing editor for the customizable footer.
 *
 * Tabbed editor: Brand | Columns | Socials | Newsletter | Legal | Layout.
 * Loads via GET and saves via PUT to the "footer-config" slot.
 */

import { useEffect, useId, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useCan } from "@/features/permissions";
import { MediaPickerField } from "@/features/media";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  defaultFooterConfig,
  FooterConfigSchema,
  SOCIAL_NETWORKS,
  type FooterConfig,
  type FooterColumn,
  type FooterSocial,
  type SocialNetwork,
  type NavItem,
  type NavCtaStyle,
} from "@repo/shared";

function coerceFooterConfig(raw: unknown): FooterConfig {
  const parsed = FooterConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return defaultFooterConfig();
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item!);
  return copy;
}

export function FooterPanel({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { allowed: canUpdate } = useCan("WEBSITE.NAV_MENUS.UPDATE");
  const isDisabled = disabled || !canUpdate;

  const footerRow = null;

  const [config, setConfig] = useState<FooterConfig>(defaultFooterConfig);
  const [dirty, setDirty] = useState(false);
  const [selectedColumnIdx, setSelectedColumnIdx] = useState<number | null>(
    null,
  );
  const [selectedSocialIdx, setSelectedSocialIdx] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const next = defaultFooterConfig();
    setConfig(next);
    setDirty(false);
    setSelectedColumnIdx(null);
    setSelectedSocialIdx(null);
  }, []);

  const update = (patch: Partial<FooterConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setDirty(true);
  };

  const updateColumn = (idx: number, next: FooterColumn) => {
    setConfig((c) => {
      const columns = [...c.columns];
      columns[idx] = next;
      return { ...c, columns };
    });
    setDirty(true);
  };

  const removeColumn = (idx: number) => {
    setConfig((c) => ({
      ...c,
      columns: c.columns.filter((_, i) => i !== idx),
    }));
    setSelectedColumnIdx(null);
    setDirty(true);
  };

  const moveColumn = (idx: number, delta: -1 | 1) => {
    setConfig((c) => ({
      ...c,
      columns: move(c.columns, idx, idx + delta),
    }));
    setSelectedColumnIdx((s) => (s === idx ? idx + delta : s));
    setDirty(true);
  };

  const addColumn = () => {
    const next: FooterColumn = {
      heading: "New Column",
      items: [{ kind: "link", label: "New link", href: "/" }],
    };
    setConfig((c) => ({
      ...c,
      columns: [...c.columns, next],
    }));
    setSelectedColumnIdx(config.columns.length);
    setDirty(true);
  };

  const updateSocial = (idx: number, next: FooterSocial) => {
    setConfig((c) => {
      const socials = [...c.socials];
      socials[idx] = next;
      return { ...c, socials };
    });
    setDirty(true);
  };

  const removeSocial = (idx: number) => {
    setConfig((c) => ({
      ...c,
      socials: c.socials.filter((_, i) => i !== idx),
    }));
    setSelectedSocialIdx(null);
    setDirty(true);
  };

  const addSocial = () => {
    const next: FooterSocial = {
      network: "facebook",
      href: "",
    };
    setConfig((c) => ({
      ...c,
      socials: [...c.socials, next],
    }));
    setSelectedSocialIdx(config.socials.length);
    setDirty(true);
  };

  const handleSave = async () => {
    toast({
      title: "Footer saving not available",
      description:
        "Footer configuration is managed through the site editor blocks.",
      variant: "default",
    });
  };

  const handleReset = () => {
    setConfig(defaultFooterConfig());
    setDirty(true);
    setSelectedColumnIdx(null);
    setSelectedSocialIdx(null);
  };

  return (
    <Tabs defaultValue="brand" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="brand">Brand</TabsTrigger>
        <TabsTrigger value="columns">Columns</TabsTrigger>
        <TabsTrigger value="socials">Socials</TabsTrigger>
        <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
        <TabsTrigger value="legal">Legal</TabsTrigger>
        <TabsTrigger value="layout">Layout</TabsTrigger>
      </TabsList>

      {/* Brand Tab */}
      <TabsContent value="brand">
        <Card>
          <CardHeader>
            <CardTitle>Brand</CardTitle>
            <CardDescription>
              Logo, name, and tagline displayed in the footer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <MediaPickerField
                value={config.brand.logoUrl ?? ""}
                onChange={(url) =>
                  update({
                    brand: { ...config.brand, logoUrl: url || undefined },
                  })
                }
                disabled={isDisabled}
                accept="image/*"
                previewSize={64}
                helperText="Recommended: 200×80 or similar"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo-alt">Logo alt text</Label>
              <Input
                id="logo-alt"
                value={config.brand.logoAlt ?? ""}
                onChange={(e) =>
                  update({
                    brand: {
                      ...config.brand,
                      logoAlt: e.target.value || undefined,
                    },
                  })
                }
                placeholder="Company logo"
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Brand name</Label>
              <Input
                id="brand-name"
                value={config.brand.name ?? ""}
                onChange={(e) =>
                  update({
                    brand: {
                      ...config.brand,
                      name: e.target.value || undefined,
                    },
                  })
                }
                placeholder="Company name"
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand-tagline">Tagline</Label>
              <Input
                id="brand-tagline"
                value={config.brand.tagline ?? ""}
                onChange={(e) =>
                  update({
                    brand: {
                      ...config.brand,
                      tagline: e.target.value || undefined,
                    },
                  })
                }
                placeholder="Your company tagline"
                disabled={isDisabled}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Columns Tab */}
      <TabsContent value="columns">
        <Card>
          <CardHeader>
            <CardTitle>Columns</CardTitle>
            <CardDescription>
              Add footer link sections with static/auto-expanded items. Reorder
              using up/down arrows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.columns.map((column, colIdx) => (
              <div
                key={colIdx}
                className="rounded border p-4"
                style={{
                  background:
                    selectedColumnIdx === colIdx
                      ? "var(--color-muted)"
                      : undefined,
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <Label>Column {colIdx + 1}</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveColumn(colIdx, -1)}
                      disabled={isDisabled || colIdx === 0}
                      aria-label="Move column up"
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveColumn(colIdx, 1)}
                      disabled={
                        isDisabled || colIdx === config.columns.length - 1
                      }
                      aria-label="Move column down"
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeColumn(colIdx)}
                      disabled={isDisabled}
                      className="text-destructive"
                      aria-label="Delete column"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`col-heading-${colIdx}`}>Heading</Label>
                    <Input
                      id={`col-heading-${colIdx}`}
                      value={column.heading}
                      onChange={(e) =>
                        updateColumn(colIdx, {
                          ...column,
                          heading: e.target.value,
                        })
                      }
                      placeholder="Section heading"
                      disabled={isDisabled}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Items ({column.items.length})</Label>
                      <Select
                        onValueChange={(kind) => {
                          const newItem: NavItem =
                            kind === "link"
                              ? {
                                  kind: "link",
                                  label: "New link",
                                  href: "/",
                                }
                              : kind === "cta"
                                ? {
                                    kind: "cta",
                                    label: "New button",
                                    href: "/",
                                    style: "primary",
                                  }
                                : kind === "pages-auto"
                                  ? { kind: "pages-auto", label: "Pages" }
                                  : {
                                      kind: "category-auto",
                                      label: "Categories",
                                    };
                          updateColumn(colIdx, {
                            ...column,
                            items: [...column.items, newItem],
                          });
                        }}
                        disabled={isDisabled || column.items.length >= 20}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Add item…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="cta">Button (CTA)</SelectItem>
                          <SelectItem value="pages-auto">
                            Pages (auto)
                          </SelectItem>
                          <SelectItem value="category-auto">
                            Categories (auto)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {column.items.map((item, itemIdx) => (
                        <FooterColumnItemRow
                          key={itemIdx}
                          item={item}
                          onUpdate={(next) => {
                            const items = [...column.items];
                            items[itemIdx] = next;
                            updateColumn(colIdx, { ...column, items });
                          }}
                          onRemove={() => {
                            const items = column.items.filter(
                              (_, i) => i !== itemIdx,
                            );
                            updateColumn(colIdx, { ...column, items });
                          }}
                          disabled={isDisabled}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {config.columns.length < 6 && (
              <Button
                onClick={addColumn}
                disabled={isDisabled}
                variant="outline"
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add column
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Socials Tab */}
      <TabsContent value="socials">
        <Card>
          <CardHeader>
            <CardTitle>Social Networks</CardTitle>
            <CardDescription>
              Links to your social media profiles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.socials.map((social, idx) => (
              <div
                key={idx}
                className="flex gap-2"
                style={{
                  background:
                    selectedSocialIdx === idx
                      ? "var(--color-muted)"
                      : undefined,
                }}
              >
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`social-network-${idx}`}>Network</Label>
                  <Select
                    value={social.network}
                    onValueChange={(v) =>
                      updateSocial(idx, {
                        ...social,
                        network: v as SocialNetwork,
                      })
                    }
                    disabled={isDisabled}
                  >
                    <SelectTrigger id={`social-network-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_NETWORKS.map((net) => (
                        <SelectItem key={net} value={net}>
                          {net.charAt(0).toUpperCase() + net.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`social-href-${idx}`}>URL</Label>
                  <Input
                    id={`social-href-${idx}`}
                    value={social.href}
                    onChange={(e) =>
                      updateSocial(idx, {
                        ...social,
                        href: e.target.value,
                      })
                    }
                    placeholder="https://…"
                    disabled={isDisabled}
                  />
                </div>

                <div className="flex items-end justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSocial(idx)}
                    disabled={isDisabled}
                    className="text-destructive"
                    aria-label={`Delete ${social.network} link`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}

            {config.socials.length < SOCIAL_NETWORKS.length && (
              <Button
                onClick={addSocial}
                disabled={isDisabled}
                variant="outline"
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add social link
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Newsletter Tab */}
      <TabsContent value="newsletter">
        <Card>
          <CardHeader>
            <CardTitle>Newsletter</CardTitle>
            <CardDescription>
              Email subscription form in the footer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="newsletter-enabled">
                Enable newsletter signup
              </Label>
              <Switch
                id="newsletter-enabled"
                checked={config.newsletter.enabled}
                onCheckedChange={(v) =>
                  update({
                    newsletter: { ...config.newsletter, enabled: v },
                  })
                }
                disabled={isDisabled}
              />
            </div>

            {config.newsletter.enabled && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="newsletter-heading">Heading</Label>
                  <Input
                    id="newsletter-heading"
                    value={config.newsletter.heading ?? ""}
                    onChange={(e) =>
                      update({
                        newsletter: {
                          ...config.newsletter,
                          heading: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="Stay in the loop"
                    disabled={isDisabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newsletter-placeholder">
                    Email placeholder
                  </Label>
                  <Input
                    id="newsletter-placeholder"
                    value={config.newsletter.placeholder ?? ""}
                    onChange={(e) =>
                      update({
                        newsletter: {
                          ...config.newsletter,
                          placeholder: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="you@example.com"
                    disabled={isDisabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newsletter-button">Button label</Label>
                  <Input
                    id="newsletter-button"
                    value={config.newsletter.buttonLabel ?? ""}
                    onChange={(e) =>
                      update({
                        newsletter: {
                          ...config.newsletter,
                          buttonLabel: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="Subscribe"
                    disabled={isDisabled}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Legal Tab */}
      <TabsContent value="legal">
        <Card>
          <CardHeader>
            <CardTitle>Legal</CardTitle>
            <CardDescription>Copyright notice and legal links.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="legal-copyright">Copyright text</Label>
              <Input
                id="legal-copyright"
                value={config.legal.copyrightText ?? ""}
                onChange={(e) =>
                  update({
                    legal: {
                      ...config.legal,
                      copyrightText: e.target.value || undefined,
                    },
                  })
                }
                placeholder="Custom copyright text (optional)"
                disabled={isDisabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="legal-show-year">Include year in copyright</Label>
              <Switch
                id="legal-show-year"
                checked={config.legal.showYear}
                onCheckedChange={(v) =>
                  update({
                    legal: { ...config.legal, showYear: v },
                  })
                }
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Links ({config.legal.links.length})</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update({
                      legal: {
                        ...config.legal,
                        links: [
                          ...config.legal.links,
                          { label: "Privacy", href: "/privacy" },
                        ],
                      },
                    })
                  }
                  disabled={isDisabled || config.legal.links.length >= 10}
                >
                  <Plus size={14} className="mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {config.legal.links.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={link.label}
                      onChange={(e) => {
                        const links = [...config.legal.links];
                        links[idx] = { ...link, label: e.target.value };
                        update({ legal: { ...config.legal, links } });
                      }}
                      placeholder="Link label"
                      disabled={isDisabled}
                      size={1}
                      className="flex-1"
                      aria-label={`Legal link ${idx + 1} label`}
                    />
                    <Input
                      value={link.href}
                      onChange={(e) => {
                        const links = [...config.legal.links];
                        links[idx] = { ...link, href: e.target.value };
                        update({ legal: { ...config.legal, links } });
                      }}
                      placeholder="/path"
                      disabled={isDisabled}
                      size={1}
                      className="flex-1"
                      aria-label={`Legal link ${idx + 1} URL`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const links = config.legal.links.filter(
                          (_, i) => i !== idx,
                        );
                        update({ legal: { ...config.legal, links } });
                      }}
                      disabled={isDisabled}
                      aria-label={`Delete legal link ${idx + 1}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Layout Tab */}
      <TabsContent value="layout">
        <Card>
          <CardHeader>
            <CardTitle>Layout & Appearance</CardTitle>
            <CardDescription>
              Configure footer layout and background style.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="footer-layout">Layout</Label>
              <Select
                value={config.layout}
                onValueChange={(v) =>
                  update({ layout: v as FooterConfig["layout"] })
                }
                disabled={isDisabled}
              >
                <SelectTrigger id="footer-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="columns">Columns</SelectItem>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="stacked">Stacked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footer-background">Background</Label>
              <Select
                value={config.background}
                onValueChange={(v) =>
                  update({ background: v as FooterConfig["background"] })
                }
                disabled={isDisabled}
              >
                <SelectTrigger id="footer-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="muted">Muted</SelectItem>
                  <SelectItem value="inverse">Inverse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Info notice */}
      <div className="rounded border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Footer configuration is now managed through the site editor using
          blocks. Visit the design editor to customize your footer.
        </p>
      </div>
    </Tabs>
  );
}

function FooterColumnItemRow({
  item,
  onUpdate,
  onRemove,
  disabled,
}: {
  item: NavItem;
  onUpdate: (next: NavItem) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 rounded border border-border p-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-sm"
          onClick={() => setExpanded(!expanded)}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${itemLabel(item)}`}
        >
          <span className="font-medium">{itemLabel(item)}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {itemKindBadge(item)}
          </span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Delete item: ${itemLabel(item)}`}
        >
          <Trash2 size={14} />
        </Button>
      </div>
      {expanded && (
        <div className="border-l-2 border-border pl-3 py-2">
          <FooterItemInspector
            item={item}
            onChange={onUpdate}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}

function itemLabel(item: NavItem): string {
  if (
    item.kind === "link" ||
    item.kind === "cta" ||
    item.kind === "pages-auto" ||
    item.kind === "category-auto"
  ) {
    return item.label;
  }
  return "Item";
}

function itemKindBadge(item: NavItem): string {
  if (item.kind === "link") return `→ ${item.href}`;
  if (item.kind === "cta") return `button: ${item.style}`;
  if (item.kind === "pages-auto") return "auto: tenant pages";
  if (item.kind === "category-auto") return "auto: categories";
  return item.kind;
}

function FooterItemInspector({
  item,
  onChange,
  disabled,
}: {
  item: NavItem;
  onChange: (next: NavItem) => void;
  disabled?: boolean;
}) {
  const baseId = useId();

  if (item.kind === "link") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Label</Label>
          <Input
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label>URL</Label>
          <Input
            value={item.href}
            onChange={(e) => onChange({ ...item, href: e.target.value })}
            placeholder="/products"
            disabled={disabled}
            size={1}
          />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between">
          <Label htmlFor={`${baseId}-link-new-tab`}>Open in new tab</Label>
          <Switch
            id={`${baseId}-link-new-tab`}
            checked={!!item.openInNewTab}
            onCheckedChange={(v) => onChange({ ...item, openInNewTab: v })}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  if (item.kind === "cta") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Label</Label>
          <Input
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label>URL</Label>
          <Input
            value={item.href}
            onChange={(e) => onChange({ ...item, href: e.target.value })}
            placeholder="/products"
            disabled={disabled}
            size={1}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${baseId}-cta-style`}>Style</Label>
          <Select
            value={item.style}
            onValueChange={(v) =>
              onChange({ ...item, style: v as NavCtaStyle })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${baseId}-cta-style`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (item.kind === "pages-auto") {
    return (
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-pages-auto-label`}>Section label</Label>
        <Input
          id={`${baseId}-pages-auto-label`}
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          disabled={disabled}
          size={1}
        />
        <p className="text-xs text-muted-foreground">
          Auto-expands to all published pages marked &quot;Show in nav&quot;.
        </p>
      </div>
    );
  }

  if (item.kind === "category-auto") {
    return (
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-categories-auto-label`}>Section label</Label>
        <Input
          id={`${baseId}-categories-auto-label`}
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          disabled={disabled}
          size={1}
        />
        <p className="text-xs text-muted-foreground">
          Auto-expands to all active product categories.
        </p>
      </div>
    );
  }

  return null;
}
