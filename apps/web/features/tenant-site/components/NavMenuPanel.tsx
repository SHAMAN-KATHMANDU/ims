"use client";

/**
 * NavMenuPanel — tenant-facing editor for the customizable header navbar.
 *
 * Structure: tabs for:
 *   - Menu items: editable link/cta/pages-auto with recursive dropdown/mega-column support
 *   - Settings: layout, behavior, logo, cta, mobile drawer style & search
 *   - Mobile drawer: separate slot editor + mirror-header action
 *
 * Single dirty flag + save action keeps the workflow coherent.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Link2, Trash2, Plus, Copy } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useCan } from "@/features/permissions";
import { MediaPickerField } from "@/features/media";
import {
  defaultHeaderNavConfig,
  NavConfigSchema,
  NavItemsOnlySchema,
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

function coerceMobileDrawerItems(raw: unknown): NavItem[] {
  const parsed = NavItemsOnlySchema.safeParse(raw);
  if (parsed.success) return parsed.data.items;
  return [];
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
  const { allowed: canUpdate } = useCan("WEBSITE.NAV_MENUS.UPDATE");
  const isDisabled = disabled || !canUpdate;
  const menusQuery = useNavMenus();
  const upsert = useUpsertNavMenu();

  const headerRow = useMemo(
    () => pickMenuForSlot(menusQuery.data, "header-primary"),
    [menusQuery.data],
  );

  const mobileDrawerRow = useMemo(
    () => pickMenuForSlot(menusQuery.data, "mobile-drawer"),
    [menusQuery.data],
  );

  const [config, setConfig] = useState<NavConfig>(defaultHeaderNavConfig);
  const [mobileDrawerItems, setMobileDrawerItems] = useState<NavItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [dirtyMobileDrawer, setDirtyMobileDrawer] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedMobileIdx, setSelectedMobileIdx] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (menusQuery.isLoading) return;
    const next = headerRow
      ? coerceHeaderConfig(headerRow.items)
      : defaultHeaderNavConfig();
    setConfig(next);
    setDirty(false);
    setSelectedIdx(null);
  }, [headerRow, menusQuery.isLoading]);

  useEffect(() => {
    if (menusQuery.isLoading) return;
    const next = coerceMobileDrawerItems(mobileDrawerRow?.items ?? null);
    setMobileDrawerItems(next);
    setDirtyMobileDrawer(false);
    setSelectedMobileIdx(null);
  }, [mobileDrawerRow, menusQuery.isLoading]);

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

  const addMobileItem = (kind: EditableKind) => {
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
    setMobileDrawerItems((items) => [...items, next]);
    setSelectedMobileIdx(mobileDrawerItems.length);
    setDirtyMobileDrawer(true);
  };

  const updateMobileItem = (idx: number, next: NavItem) => {
    setMobileDrawerItems((items) => {
      const updated = [...items];
      updated[idx] = next;
      return updated;
    });
    setDirtyMobileDrawer(true);
  };

  const removeMobileItem = (idx: number) => {
    setMobileDrawerItems((items) => items.filter((_, i) => i !== idx));
    setSelectedMobileIdx(null);
    setDirtyMobileDrawer(true);
  };

  const moveMobileItem = (idx: number, delta: -1 | 1) => {
    setMobileDrawerItems((items) => move(items, idx, idx + delta));
    setSelectedMobileIdx((s) => (s === idx ? idx + delta : s));
    setDirtyMobileDrawer(true);
  };

  const mirrorHeaderToMobileDrawer = () => {
    const headerItems = config.items;
    setMobileDrawerItems(headerItems);
    setDirtyMobileDrawer(true);
    toast({ title: "Header items copied to mobile drawer" });
  };

  const handleSaveHeader = async () => {
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

  const handleSaveMobileDrawer = async () => {
    const parsed = NavItemsOnlySchema.safeParse({ items: mobileDrawerItems });
    if (!parsed.success) {
      toast({
        title: "Mobile drawer invalid",
        description: parsed.error.issues[0]?.message ?? "Check your fields",
        variant: "destructive",
      });
      return;
    }
    try {
      await upsert.mutateAsync({
        slot: "mobile-drawer",
        items: parsed.data,
      });
      toast({ title: "Mobile drawer saved" });
      setDirtyMobileDrawer(false);
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
      <Tabs defaultValue="menu-items" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menu-items">Menu items</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="mobile-drawer">Mobile drawer</TabsTrigger>
        </TabsList>

        {/* Menu items tab */}
        <TabsContent value="menu-items" className="space-y-4">
          {/* Menu items card */}
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
                    disabled={isDisabled}
                  >
                    + Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addItem("cta")}
                    disabled={isDisabled}
                  >
                    + CTA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addItem("pages-auto")}
                    disabled={isDisabled}
                  >
                    + Pages
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {config.items.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center">
                  <Link2
                    className="mx-auto mb-2 h-5 w-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    No menu items yet. Click <strong>+ Link</strong> above to
                    get started.
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
                        <MenuItemRow
                          item={item}
                          idx={idx}
                          selected={selected}
                          onSelect={() => setSelectedIdx(selected ? null : idx)}
                          onUpdate={(next) => updateItem(idx, next)}
                          onRemove={() => removeItem(idx)}
                          onMove={(delta) => moveItem(idx, delta)}
                          canMoveUp={idx > 0}
                          canMoveDown={idx < config.items.length - 1}
                          disabled={isDisabled}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Header layout + behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Header layout</CardTitle>
              <CardDescription>
                Choose how your header is arranged and how it behaves as
                visitors scroll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Layout</Label>
                  <Select
                    value={config.layout}
                    onValueChange={(v) =>
                      update({ layout: v as NavHeaderLayout })
                    }
                    disabled={isDisabled}
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
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sticky">
                        Sticky — stay at top
                      </SelectItem>
                      <SelectItem value="static">
                        Static — scroll away
                      </SelectItem>
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

          {/* Logo control */}
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Optional logo for this nav. Overrides the business profile logo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaPickerField
                value={config.logo?.url ?? ""}
                onChange={(url) =>
                  update({
                    logo: url
                      ? { url, alt: config.logo?.alt ?? "" }
                      : undefined,
                  })
                }
                id="nav-logo"
                placeholder="https://example.com/logo.png"
                disabled={isDisabled}
                accept="image/*"
                previewSize={80}
                helperText="Upload or paste a logo URL. SVG or PNG recommended."
              />
              {config.logo && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="logo-alt">Alt text</Label>
                  <Input
                    id="logo-alt"
                    value={config.logo.alt ?? ""}
                    onChange={(e) =>
                      update({
                        logo: {
                          url: config.logo!.url,
                          alt: e.target.value,
                        },
                      })
                    }
                    placeholder="Company logo"
                    disabled={isDisabled}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA button */}
          <Card>
            <CardHeader>
              <CardTitle>Trailing CTA</CardTitle>
              <CardDescription>
                Optional call-to-action button at the end of the header.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ToggleRow
                  label="Show CTA button"
                  checked={!!config.cta}
                  onCheckedChange={(v) => {
                    if (v) {
                      update({
                        cta: {
                          label: "Shop now",
                          href: "/products",
                          style: "primary",
                        },
                      });
                    } else {
                      update({ cta: undefined });
                    }
                  }}
                  disabled={isDisabled}
                />
                {config.cta && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Label</Label>
                      <Input
                        value={config.cta.label}
                        onChange={(e) =>
                          update({
                            cta: { ...config.cta!, label: e.target.value },
                          })
                        }
                        disabled={isDisabled}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>URL</Label>
                      <Input
                        value={config.cta.href}
                        onChange={(e) =>
                          update({
                            cta: { ...config.cta!, href: e.target.value },
                          })
                        }
                        placeholder="/products"
                        disabled={isDisabled}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Style</Label>
                      <Select
                        value={config.cta.style}
                        onValueChange={(v) =>
                          update({
                            cta: { ...config.cta!, style: v as NavCtaStyle },
                          })
                        }
                        disabled={isDisabled}
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
                )}
              </div>
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
                  disabled={isDisabled}
                />
                <ToggleRow
                  label="Show search"
                  checked={config.showSearch}
                  onCheckedChange={(v) => update({ showSearch: v })}
                  disabled={isDisabled}
                />
                <ToggleRow
                  label="Show account"
                  checked={config.showAccount}
                  onCheckedChange={(v) => update({ showAccount: v })}
                  disabled={isDisabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile drawer settings */}
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
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slide-right">
                        Slide from right
                      </SelectItem>
                      <SelectItem value="slide-left">
                        Slide from left
                      </SelectItem>
                      <SelectItem value="fullscreen">
                        Fullscreen overlay
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ToggleRow
                  label="Show search in drawer"
                  checked={config.mobile.showSearch}
                  onCheckedChange={(v) =>
                    update({ mobile: { ...config.mobile, showSearch: v } })
                  }
                  disabled={isDisabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky save bar for settings */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isDisabled}
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
                onClick={handleSaveHeader}
                disabled={isDisabled || !dirty || upsert.isPending}
              >
                {upsert.isPending ? "Saving…" : "Save header"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Mobile drawer tab */}
        <TabsContent value="mobile-drawer" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Mobile drawer items</CardTitle>
                  <CardDescription>
                    {mobileDrawerItems.length === 0
                      ? "No items yet — add your first link or copy from header."
                      : `${mobileDrawerItems.length} item${mobileDrawerItems.length === 1 ? "" : "s"} in your drawer.`}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={mirrorHeaderToMobileDrawer}
                    disabled={isDisabled || config.items.length === 0}
                  >
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Mirror header
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addMobileItem("link")}
                    disabled={isDisabled}
                  >
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Link
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {mobileDrawerItems.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center">
                  <Link2
                    className="mx-auto mb-2 h-5 w-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    No mobile drawer items yet. Click{" "}
                    <strong>Mirror header</strong> to copy items, or add
                    manually.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {mobileDrawerItems.map((item, idx) => {
                    const selected = selectedMobileIdx === idx;
                    return (
                      <li
                        key={idx}
                        className={`rounded-md border ${selected ? "border-primary" : "border-border"}`}
                      >
                        <MenuItemRow
                          item={item}
                          idx={idx}
                          selected={selected}
                          onSelect={() =>
                            setSelectedMobileIdx(selected ? null : idx)
                          }
                          onUpdate={(next) => updateMobileItem(idx, next)}
                          onRemove={() => removeMobileItem(idx)}
                          onMove={(delta) => moveMobileItem(idx, delta)}
                          canMoveUp={idx > 0}
                          canMoveDown={idx < mobileDrawerItems.length - 1}
                          disabled={isDisabled}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Sticky save bar for mobile drawer */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {dirtyMobileDrawer && (
                <span className="text-xs text-muted-foreground">
                  Unsaved changes
                </span>
              )}
              <Button
                type="button"
                onClick={handleSaveMobileDrawer}
                disabled={isDisabled || !dirtyMobileDrawer || upsert.isPending}
              >
                {upsert.isPending ? "Saving…" : "Save drawer"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MenuItemRow({
  item,
  idx: _idx,
  selected,
  onSelect,
  onUpdate,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  disabled,
}: {
  item: NavItem;
  idx: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (next: NavItem) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-sm"
          onClick={onSelect}
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
          onClick={() => onMove(-1)}
          disabled={disabled || !canMoveUp}
          aria-label="Move up"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onMove(1)}
          disabled={disabled || !canMoveDown}
          aria-label="Move down"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Delete item"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {selected && isEditableKind(item.kind) && (
        <div className="border-t border-border p-3">
          <ItemInspector item={item} onChange={onUpdate} disabled={disabled} />
        </div>
      )}
      {selected && !isEditableKind(item.kind) && (
        <div className="border-t border-border p-3">
          <ItemInspectorComplex
            item={item}
            onChange={onUpdate}
            disabled={disabled}
          />
        </div>
      )}
    </>
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

function ItemInspectorComplex({
  item,
  onChange,
  disabled,
}: {
  item: NavItem;
  onChange: (next: NavItem) => void;
  disabled?: boolean;
}) {
  if (item.kind === "dropdown") {
    return (
      <DropdownItemEditor item={item} onChange={onChange} disabled={disabled} />
    );
  }
  if (item.kind === "mega-column") {
    return (
      <MegaColumnItemEditor
        item={item}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  return null;
}

function DropdownItemEditor({
  item,
  onChange,
  disabled,
}: {
  item: Extract<NavItem, { kind: "dropdown" }>;
  onChange: (next: NavItem) => void;
  disabled?: boolean;
}) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Label</Label>
        <Input
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Children ({item.items.length})
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onChange({
                ...item,
                items: [
                  ...item.items,
                  { kind: "link", label: "New link", href: "/" },
                ],
              });
            }}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Add item
          </Button>
        </div>
        {item.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No child items yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-1">
            {item.items.map((child, idx) => {
              const selected = editIdx === idx;
              return (
                <li
                  key={idx}
                  className={`rounded border ${selected ? "border-primary" : "border-border"} p-2`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-xs"
                      onClick={() => setEditIdx(selected ? null : idx)}
                    >
                      {itemLabel(child)}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        onChange({
                          ...item,
                          items: item.items.filter((_, i) => i !== idx),
                        });
                        setEditIdx(null);
                      }}
                      disabled={disabled}
                      aria-label="Remove dropdown link"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                  {selected && isEditableKind(child.kind) && (
                    <div className="border-t border-border mt-2 pt-2">
                      <ItemInspector
                        item={child}
                        onChange={(next) => {
                          onChange({
                            ...item,
                            items: item.items.map((c, i) =>
                              i === idx ? next : c,
                            ),
                          });
                        }}
                        disabled={disabled}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function MegaColumnItemEditor({
  item,
  onChange,
  disabled,
}: {
  item: Extract<NavItem, { kind: "mega-column" }>;
  onChange: (next: NavItem) => void;
  disabled?: boolean;
}) {
  const [editColIdx, setEditColIdx] = useState<number | null>(null);
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Label</Label>
        <Input
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Columns ({item.columns.length})
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onChange({
                ...item,
                columns: [
                  ...item.columns,
                  { heading: "New column", items: [] },
                ],
              });
            }}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Add column
          </Button>
        </div>
        {item.columns.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No columns yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {item.columns.map((col, colIdx) => {
              const colSelected = editColIdx === colIdx;
              return (
                <li key={colIdx} className="rounded border border-border p-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-xs font-medium"
                      onClick={() => setEditColIdx(colSelected ? null : colIdx)}
                    >
                      {col.heading}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        onChange({
                          ...item,
                          columns: item.columns.filter((_, i) => i !== colIdx),
                        });
                        setEditColIdx(null);
                      }}
                      disabled={disabled}
                      aria-label="Delete column"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                  {colSelected && (
                    <div className="border-t border-border mt-2 pt-2 space-y-2">
                      <div className="space-y-1">
                        <Label>Heading</Label>
                        <Input
                          value={col.heading}
                          onChange={(e) => {
                            onChange({
                              ...item,
                              columns: item.columns.map((c, i) =>
                                i === colIdx
                                  ? { ...c, heading: e.target.value }
                                  : c,
                              ),
                            });
                          }}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            Items ({col.items.length})
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onChange({
                                ...item,
                                columns: item.columns.map((c, i) =>
                                  i === colIdx
                                    ? {
                                        ...c,
                                        items: [
                                          ...c.items,
                                          {
                                            kind: "link",
                                            label: "New link",
                                            href: "/",
                                          },
                                        ],
                                      }
                                    : c,
                                ),
                              });
                            }}
                            disabled={disabled}
                          >
                            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                            Add
                          </Button>
                        </div>
                        {col.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No items in this column.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {col.items.map((child, itemIdx) => {
                              const itemSelected = editItemIdx === itemIdx;
                              return (
                                <li
                                  key={itemIdx}
                                  className={`rounded border ${itemSelected ? "border-primary" : "border-border"} p-1`}
                                >
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      className="min-w-0 flex-1 text-left text-xs"
                                      onClick={() =>
                                        setEditItemIdx(
                                          itemSelected ? null : itemIdx,
                                        )
                                      }
                                    >
                                      {itemLabel(child)}
                                    </button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5"
                                      onClick={() => {
                                        onChange({
                                          ...item,
                                          columns: item.columns.map((c, i) =>
                                            i === colIdx
                                              ? {
                                                  ...c,
                                                  items: c.items.filter(
                                                    (_, j) => j !== itemIdx,
                                                  ),
                                                }
                                              : c,
                                          ),
                                        });
                                        setEditItemIdx(null);
                                      }}
                                      disabled={disabled}
                                      aria-label="Remove mega-column link"
                                    >
                                      <Trash2
                                        className="h-2.5 w-2.5"
                                        aria-hidden="true"
                                      />
                                    </Button>
                                  </div>
                                  {itemSelected &&
                                    isEditableKind(child.kind) && (
                                      <div className="border-t border-border mt-1 pt-1">
                                        <ItemInspector
                                          item={child}
                                          onChange={(next) => {
                                            onChange({
                                              ...item,
                                              columns: item.columns.map(
                                                (c, i) =>
                                                  i === colIdx
                                                    ? {
                                                        ...c,
                                                        items: c.items.map(
                                                          (child2, j) =>
                                                            j === itemIdx
                                                              ? next
                                                              : child2,
                                                        ),
                                                      }
                                                    : c,
                                              ),
                                            });
                                          }}
                                          disabled={disabled}
                                        />
                                      </div>
                                    )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
