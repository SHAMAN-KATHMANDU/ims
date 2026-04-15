"use client";

/**
 * NavMenuPanel — tenant-facing editor for the customizable header navbar.
 *
 * Structure: one stateful container that fans out to four sibling cards
 * (Header layout / Menu items / Header features / Mobile drawer) plus a
 * sticky save bar. A single dirty flag + single save action keeps the
 * workflow coherent — the tenant doesn't have to save each section
 * separately — while the card decomposition makes the dense surface
 * scannable and gives each concern breathing room.
 *
 * Item editing supports link / cta / pages-auto inline; dropdown /
 * mega-column nodes (which the schema + renderer support) get a friendly
 * "edit in Phase 4+ block editor" note rather than a broken form.
 */

import { useEffect, useMemo, useState } from "react";
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
import { ArrowDown, ArrowUp, Link2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  defaultHeaderNavConfig,
  NavConfigSchema,
  type NavConfig,
  type NavCtaStyle,
  type NavHeaderBehavior,
  type NavHeaderLayout,
  type NavItem,
  type NavMobileDrawerStyle,
} from "@repo/shared";
import {
  useNavMenus,
  useUpsertNavMenu,
  pickMenuForSlot,
} from "../hooks/use-nav-menus";

type EditableKind = "link" | "cta" | "pages-auto";

function isEditableKind(kind: string): kind is EditableKind {
  return kind === "link" || kind === "cta" || kind === "pages-auto";
}

function coerceHeaderConfig(raw: unknown): NavConfig {
  const parsed = NavConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return defaultHeaderNavConfig();
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item!);
  return copy;
}

export function NavMenuPanel({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const menusQuery = useNavMenus();
  const upsert = useUpsertNavMenu();

  const headerRow = useMemo(
    () => pickMenuForSlot(menusQuery.data, "header-primary"),
    [menusQuery.data],
  );

  const [config, setConfig] = useState<NavConfig>(defaultHeaderNavConfig);
  const [dirty, setDirty] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (menusQuery.isLoading) return;
    const next = headerRow
      ? coerceHeaderConfig(headerRow.items)
      : defaultHeaderNavConfig();
    setConfig(next);
    setDirty(false);
    setSelectedIdx(null);
  }, [headerRow, menusQuery.isLoading]);

  const update = (patch: Partial<NavConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setDirty(true);
  };

  const updateItem = (idx: number, next: NavItem) => {
    setConfig((c) => {
      const items = [...c.items];
      items[idx] = next;
      return { ...c, items };
    });
    setDirty(true);
  };

  const removeItem = (idx: number) => {
    setConfig((c) => ({ ...c, items: c.items.filter((_, i) => i !== idx) }));
    setSelectedIdx(null);
    setDirty(true);
  };

  const moveItem = (idx: number, delta: -1 | 1) => {
    setConfig((c) => ({ ...c, items: move(c.items, idx, idx + delta) }));
    setSelectedIdx((s) => (s === idx ? idx + delta : s));
    setDirty(true);
  };

  const addItem = (kind: EditableKind) => {
    const next: NavItem =
      kind === "link"
        ? { kind: "link", label: "New link", href: "/" }
        : kind === "cta"
          ? {
              kind: "cta",
              label: "Shop now",
              href: "/products",
              style: "primary",
            }
          : { kind: "pages-auto", label: "Pages" };
    setConfig((c) => ({ ...c, items: [...c.items, next] }));
    setSelectedIdx(config.items.length);
    setDirty(true);
  };

  const handleSave = async () => {
    const parsed = NavConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast({
        title: "Nav menu invalid",
        description: parsed.error.issues[0]?.message ?? "Check your fields",
        variant: "destructive",
      });
      return;
    }
    try {
      await upsert.mutateAsync({
        slot: "header-primary",
        items: parsed.data,
      });
      toast({ title: "Header menu saved" });
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
    setConfig(defaultHeaderNavConfig());
    setDirty(true);
    setSelectedIdx(null);
  };

  return (
    <div className="space-y-4">
      {/* Header layout + behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Header layout</CardTitle>
          <CardDescription>
            Choose how your header is arranged and how it behaves as visitors
            scroll.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Layout</Label>
              <Select
                value={config.layout}
                onValueChange={(v) => update({ layout: v as NavHeaderLayout })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    Standard — brand left, links right
                  </SelectItem>
                  <SelectItem value="centered">
                    Centered — brand above links
                  </SelectItem>
                  <SelectItem value="split">
                    Split — brand between links
                  </SelectItem>
                  <SelectItem value="minimal">
                    Minimal — brand + CTA only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scroll behavior</Label>
              <Select
                value={config.behavior}
                onValueChange={(v) =>
                  update({ behavior: v as NavHeaderBehavior })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sticky">Sticky — stay at top</SelectItem>
                  <SelectItem value="static">Static — scroll away</SelectItem>
                  <SelectItem value="scroll-hide">
                    Hide on scroll down
                  </SelectItem>
                  <SelectItem value="transparent-on-hero">
                    Transparent over hero
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu items */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Menu items</CardTitle>
              <CardDescription>
                {config.items.length === 0
                  ? "No items yet — add your first link, CTA, or page list."
                  : `${config.items.length} item${config.items.length === 1 ? "" : "s"} in your header.`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addItem("link")}
                disabled={disabled}
              >
                + Link
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addItem("cta")}
                disabled={disabled}
              >
                + CTA
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addItem("pages-auto")}
                disabled={disabled}
              >
                + Pages
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {config.items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <Link2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No menu items yet. Click <strong>+ Link</strong> above to get
                started.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {config.items.map((item, idx) => {
                const selected = selectedIdx === idx;
                return (
                  <li
                    key={idx}
                    className={`rounded-md border ${selected ? "border-primary" : "border-border"}`}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-sm"
                        onClick={() => setSelectedIdx(selected ? null : idx)}
                      >
                        <span className="font-medium">{itemLabel(item)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {kindBadge(item)}
                        </span>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => moveItem(idx, -1)}
                        disabled={disabled || idx === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => moveItem(idx, 1)}
                        disabled={disabled || idx === config.items.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => removeItem(idx)}
                        disabled={disabled}
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {selected && isEditableKind(item.kind) && (
                      <div className="border-t border-border p-3">
                        <ItemInspector
                          item={item}
                          onChange={(next) => updateItem(idx, next)}
                          disabled={disabled}
                        />
                      </div>
                    )}
                    {selected && !isEditableKind(item.kind) && (
                      <div className="border-t border-border p-3 text-xs text-muted-foreground">
                        This item type (dropdown / mega-menu) can&apos;t be
                        edited inline yet. Save as-is or remove it.
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Header features */}
      <Card>
        <CardHeader>
          <CardTitle>Header features</CardTitle>
          <CardDescription>
            Toggle the cart badge, search, and account icons in your header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <ToggleRow
              label="Show cart badge"
              checked={config.showCart}
              onCheckedChange={(v) => update({ showCart: v })}
              disabled={disabled}
            />
            <ToggleRow
              label="Show search"
              checked={config.showSearch}
              onCheckedChange={(v) => update({ showSearch: v })}
              disabled={disabled}
            />
            <ToggleRow
              label="Show account"
              checked={config.showAccount}
              onCheckedChange={(v) => update({ showAccount: v })}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile drawer */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile drawer</CardTitle>
          <CardDescription>
            How the navigation appears on mobile devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Drawer style</Label>
              <Select
                value={config.mobile.drawerStyle}
                onValueChange={(v) =>
                  update({
                    mobile: {
                      ...config.mobile,
                      drawerStyle: v as NavMobileDrawerStyle,
                    },
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slide-right">Slide from right</SelectItem>
                  <SelectItem value="slide-left">Slide from left</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen overlay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              label="Show search in drawer"
              checked={config.mobile.showSearch}
              onCheckedChange={(v) =>
                update({ mobile: { ...config.mobile, showSearch: v } })
              }
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={disabled}
        >
          Reset to default
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
            disabled={disabled || !dirty || upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : "Save header"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <span className="text-sm">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

function itemLabel(item: NavItem): string {
  if (item.kind === "link" || item.kind === "cta") return item.label;
  if (item.kind === "dropdown" || item.kind === "mega-column")
    return item.label;
  return item.label;
}

function kindBadge(item: NavItem): string {
  if (item.kind === "link") return `→ ${item.href}`;
  if (item.kind === "cta") return `CTA · ${item.style}`;
  if (item.kind === "pages-auto") return "auto: tenant pages";
  if (item.kind === "category-auto") return "auto: categories";
  if (item.kind === "dropdown") return `${item.items.length} items`;
  return `${item.columns.length} columns`;
}

function ItemInspector({
  item,
  onChange,
  disabled,
}: {
  item: NavItem;
  onChange: (next: NavItem) => void;
  disabled?: boolean;
}) {
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
          />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border p-2">
          <span className="text-sm">Open in new tab</span>
          <Switch
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
          />
        </div>
        <div className="space-y-1">
          <Label>Button style</Label>
          <Select
            value={item.style}
            onValueChange={(v) =>
              onChange({ ...item, style: v as NavCtaStyle })
            }
            disabled={disabled}
          >
            <SelectTrigger>
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
        <Label>Label</Label>
        <Input
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Auto-expands into one link per published custom page (About, FAQ, ...)
          at render time.
        </p>
      </div>
    );
  }
  return null;
}
