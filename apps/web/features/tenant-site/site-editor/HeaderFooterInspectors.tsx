"use client";

/**
 * Dedicated inspector panels for header and footer block kinds.
 * These replace the generic schema-introspection form for blocks whose
 * nested structure (columns > links, nav items) benefits from a
 * purpose-built UI.
 */

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useEditorStore } from "./editor-store";
import type {
  NavBarProps,
  FooterColumnsProps,
  LogoMarkProps,
  UtilityBarProps,
  SocialLinksProps,
  PaymentIconsProps,
  CopyrightBarProps,
} from "@repo/shared";
import type { BlockNode } from "@repo/shared";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 pb-1 border-b border-stone-100">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && (
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const ALIGN_OPTIONS = [
  { value: "start", label: "Left" },
  { value: "center", label: "Center" },
  { value: "end", label: "Right" },
  { value: "between", label: "Space between" },
];

// ---------------------------------------------------------------------------
// Nav Bar Inspector
// ---------------------------------------------------------------------------

export function NavBarInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as NavBarProps;

  const patch = (partial: Partial<NavBarProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  const items = props.items ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionLabel>Brand</SectionLabel>
        <Field label="Company name">
          <Input
            value={props.brand ?? ""}
            onChange={(e) => patch({ brand: e.target.value })}
            placeholder="Your Brand"
          />
        </Field>
        <Field label="Brand link">
          <Input
            value={props.brandHref ?? "/"}
            onChange={(e) => patch({ brandHref: e.target.value })}
            placeholder="/"
          />
        </Field>
        <Field label="Brand style">
          <Select
            value={props.brandStyle ?? "sans"}
            onValueChange={(v) =>
              patch({ brandStyle: v as NavBarProps["brandStyle"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sans">Sans-serif</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-3">
        <SectionLabel>Layout</SectionLabel>
        <Field label="Alignment">
          <Select
            value={props.align ?? "between"}
            onValueChange={(v) => patch({ align: v as NavBarProps["align"] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="between">Logo left · links right</SelectItem>
              <SelectItem value="center">Logo center · links below</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ToggleRow
          label="Sticky header"
          hint="Stays pinned to the top while scrolling"
          checked={props.sticky !== false}
          onChange={(v) => patch({ sticky: v })}
        />
      </div>

      <div className="space-y-3">
        <SectionLabel>Icons & Actions</SectionLabel>
        <ToggleRow
          label="Search icon"
          checked={props.showSearch !== false}
          onChange={(v) => patch({ showSearch: v })}
        />
        <ToggleRow
          label="Cart icon"
          checked={props.showCart !== false}
          onChange={(v) => patch({ showCart: v })}
        />
        <ToggleRow
          label="Account icon"
          checked={props.showAccount === true}
          onChange={(v) => patch({ showAccount: v })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Navigation links</SectionLabel>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2"
            onClick={() =>
              patch({
                items: [...items, { label: "New link", href: "/" }],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No navigation links yet.
          </div>
        )}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <NavItemRow
              key={idx}
              label={item.label}
              href={item.href}
              onChange={(label, href) => {
                const next = [...items];
                next[idx] = { ...next[idx], label, href };
                patch({ items: next });
              }}
              onRemove={() =>
                patch({ items: items.filter((_, i) => i !== idx) })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavItemRow({
  label,
  href,
  onChange,
  onRemove,
}: {
  label: string;
  href: string;
  onChange: (label: string, href: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <GripVertical
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
        aria-hidden
      />
      <Input
        value={label}
        onChange={(e) => onChange(e.target.value, href)}
        placeholder="Label"
        className="h-7 text-xs flex-1 min-w-0"
      />
      <Input
        value={href}
        onChange={(e) => onChange(label, e.target.value)}
        placeholder="/page"
        className="h-7 text-xs w-28 font-mono"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0"
        onClick={onRemove}
        aria-label="Remove link"
      >
        <Trash2 className="h-3 w-3" aria-hidden />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo Mark Inspector
// ---------------------------------------------------------------------------

export function LogoMarkInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as LogoMarkProps;
  const patch = (partial: Partial<LogoMarkProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionLabel>Brand identity</SectionLabel>
        <Field label="Company name">
          <Input
            value={props.brand ?? ""}
            onChange={(e) => patch({ brand: e.target.value })}
            placeholder="Your Brand"
          />
        </Field>
        <Field label="Tagline / subtitle">
          <Input
            value={props.subtitle ?? ""}
            onChange={(e) => patch({ subtitle: e.target.value || undefined })}
            placeholder="Short tagline"
          />
        </Field>
        <Field label="Link (click target)">
          <Input
            value={props.href ?? "/"}
            onChange={(e) => patch({ href: e.target.value })}
            placeholder="/"
          />
        </Field>
      </div>
      <div className="space-y-3">
        <SectionLabel>Style</SectionLabel>
        <Field label="Alignment">
          <Select
            value={props.align ?? "start"}
            onValueChange={(v) => patch({ align: v as LogoMarkProps["align"] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="end">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Variant">
          <Select
            value={props.variant ?? "text-only"}
            onValueChange={(v) =>
              patch({ variant: v as LogoMarkProps["variant"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text-only">Text only</SelectItem>
              <SelectItem value="with-icon">With icon</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility Bar Inspector
// ---------------------------------------------------------------------------

export function UtilityBarInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as UtilityBarProps;
  const patch = (partial: Partial<UtilityBarProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  const items = props.items ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionLabel>Layout</SectionLabel>
        <Field label="Alignment">
          <Select
            value={props.align ?? "between"}
            onValueChange={(v) =>
              patch({ align: v as UtilityBarProps["align"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALIGN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Links</SectionLabel>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2"
            onClick={() =>
              patch({
                items: [...items, { label: "New link", href: "" }],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No links yet.
          </div>
        )}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <NavItemRow
              key={idx}
              label={item.label}
              href={item.href}
              onChange={(label, href) => {
                const next = [...items];
                next[idx] = { label, href };
                patch({ items: next });
              }}
              onRemove={() =>
                patch({ items: items.filter((_, i) => i !== idx) })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer Columns Inspector  (the main one)
// ---------------------------------------------------------------------------

export function FooterColumnsInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as FooterColumnsProps;
  const [expandedCols, setExpandedCols] = useState<Record<number, boolean>>({});

  const patch = (partial: Partial<FooterColumnsProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  const columns = props.columns ?? [];

  const patchColumn = (
    colIdx: number,
    partial: Partial<{
      title: string;
      links: Array<{ label: string; href: string }>;
    }>,
  ) => {
    const next = columns.map((col, i) =>
      i === colIdx ? { ...col, ...partial } : col,
    );
    patch({ columns: next });
  };

  const addColumn = () => {
    const next = [
      ...columns,
      { title: `Column ${columns.length + 1}`, links: [] },
    ];
    patch({ columns: next });
    setExpandedCols((prev) => ({ ...prev, [next.length - 1]: true }));
  };

  const removeColumn = (idx: number) => {
    patch({ columns: columns.filter((_, i) => i !== idx) });
  };

  const toggleCol = (idx: number) =>
    setExpandedCols((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const addLink = (colIdx: number) => {
    const col = columns[colIdx];
    if (!col) return;
    patchColumn(colIdx, {
      links: [...(col.links ?? []), { label: "New link", href: "/" }],
    });
  };

  const updateLink = (
    colIdx: number,
    linkIdx: number,
    label: string,
    href: string,
  ) => {
    const col = columns[colIdx];
    if (!col) return;
    const links = (col.links ?? []).map((l, i) =>
      i === linkIdx ? { label, href } : l,
    );
    patchColumn(colIdx, { links });
  };

  const removeLink = (colIdx: number, linkIdx: number) => {
    const col = columns[colIdx];
    if (!col) return;
    patchColumn(colIdx, {
      links: (col.links ?? []).filter((_, i) => i !== linkIdx),
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Brand section ── */}
      <div className="space-y-3">
        <SectionLabel>Brand in footer</SectionLabel>
        <ToggleRow
          label="Show brand"
          hint="Display logo / company name above the link columns"
          checked={props.showBrand !== false}
          onChange={(v) => patch({ showBrand: v })}
        />
        {props.showBrand !== false && (
          <>
            <Field label="Company name">
              <Input
                value={props.brand ?? ""}
                onChange={(e) => patch({ brand: e.target.value })}
                placeholder="Your Brand"
              />
            </Field>
            <Field label="Description / tagline">
              <Textarea
                rows={3}
                value={props.tagline ?? ""}
                onChange={(e) =>
                  patch({ tagline: e.target.value || undefined })
                }
                placeholder="A short sentence about your company…"
              />
            </Field>
          </>
        )}
      </div>

      {/* ── Columns ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Columns ({columns.length})</SectionLabel>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2"
            onClick={addColumn}
            disabled={columns.length >= 6}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add column
          </Button>
        </div>

        {columns.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No columns yet. Click "Add column" to start.
          </div>
        )}

        <div className="space-y-2">
          {columns.map((col, colIdx) => {
            const isOpen = expandedCols[colIdx] !== false;
            const linkCount = col.links?.length ?? 0;
            return (
              <div
                key={colIdx}
                className="rounded-md border border-border overflow-hidden"
              >
                {/* Column header row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  onClick={() => toggleCol(colIdx)}
                >
                  {isOpen ? (
                    <ChevronDown
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  ) : (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <span className="flex-1 text-sm font-medium truncate">
                    {col.title || `Column ${colIdx + 1}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground mr-1">
                    {linkCount} link{linkCount !== 1 ? "s" : ""}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColumn(colIdx);
                    }}
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                  </Button>
                </button>

                {isOpen && (
                  <div className="p-3 space-y-3">
                    {/* Column title */}
                    <Field label="Column heading">
                      <Input
                        value={col.title}
                        onChange={(e) =>
                          patchColumn(colIdx, { title: e.target.value })
                        }
                        placeholder="Shop"
                        className="h-8 text-xs"
                      />
                    </Field>

                    {/* Links */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Links</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] px-2"
                          onClick={() => addLink(colIdx)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add link
                        </Button>
                      </div>

                      {(col.links ?? []).length === 0 && (
                        <div className="rounded border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
                          No links yet.
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {(col.links ?? []).map((link, linkIdx) => (
                          <div
                            key={linkIdx}
                            className="flex items-center gap-1.5"
                          >
                            <Input
                              value={link.label}
                              onChange={(e) =>
                                updateLink(
                                  colIdx,
                                  linkIdx,
                                  e.target.value,
                                  link.href,
                                )
                              }
                              placeholder="Label"
                              className="h-7 text-xs flex-1 min-w-0"
                            />
                            <Input
                              value={link.href}
                              onChange={(e) =>
                                updateLink(
                                  colIdx,
                                  linkIdx,
                                  link.label,
                                  e.target.value,
                                )
                              }
                              placeholder="/page"
                              className="h-7 text-xs w-28 font-mono"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => removeLink(colIdx, linkIdx)}
                              aria-label="Remove link"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social Links Inspector
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS = [
  "instagram",
  "twitter",
  "facebook",
  "pinterest",
  "tiktok",
  "youtube",
  "linkedin",
  "github",
];

export function SocialLinksInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as SocialLinksProps;
  const patch = (partial: Partial<SocialLinksProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  const items = props.items ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionLabel>Style</SectionLabel>
        <Field label="Display variant">
          <Select
            value={props.variant ?? "text"}
            onValueChange={(v) =>
              patch({ variant: v as SocialLinksProps["variant"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text with handle</SelectItem>
              <SelectItem value="icons-only">Icons only</SelectItem>
              <SelectItem value="icons-pill">Icons in pill</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Alignment">
          <Select
            value={props.align ?? "start"}
            onValueChange={(v) =>
              patch({ align: v as SocialLinksProps["align"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="end">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Accounts</SectionLabel>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2"
            onClick={() =>
              patch({
                items: [
                  ...items,
                  { platform: "instagram", handle: "@brand", href: "" },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No social accounts yet.
          </div>
        )}

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="space-y-1.5 rounded-md border border-border p-2"
            >
              <div className="flex items-center gap-1.5">
                <Select
                  value={item.platform}
                  onValueChange={(v) => {
                    const next = [...items];
                    next[idx] = {
                      platform: v,
                      handle: next[idx]?.handle,
                      href: next[idx]?.href ?? "",
                    };
                    patch({ items: next });
                  }}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() =>
                    patch({ items: items.filter((_, i) => i !== idx) })
                  }
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={item.handle ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = {
                      platform: next[idx]?.platform ?? "instagram",
                      handle: e.target.value,
                      href: next[idx]?.href ?? "",
                    };
                    patch({ items: next });
                  }}
                  placeholder="@handle"
                  className="h-7 text-xs flex-1"
                />
                <Input
                  value={item.href}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = {
                      platform: next[idx]?.platform ?? "instagram",
                      handle: next[idx]?.handle,
                      href: e.target.value,
                    };
                    patch({ items: next });
                  }}
                  placeholder="https://…"
                  className="h-7 text-xs flex-1 font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Icons Inspector
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  "Visa",
  "Mastercard",
  "Amex",
  "PayPal",
  "Apple Pay",
  "Google Pay",
  "Stripe",
  "Shop Pay",
  "Klarna",
  "Afterpay",
  "Venmo",
  "Discover",
];

export function PaymentIconsInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as PaymentIconsProps;
  const patch = (partial: Partial<PaymentIconsProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  const items = props.items ?? [];
  const enabledNames = new Set(items.map((i) => i.name));

  const toggle = (name: string) => {
    if (enabledNames.has(name)) {
      patch({ items: items.filter((i) => i.name !== name) });
    } else {
      patch({ items: [...items, { name }] });
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionLabel>Style</SectionLabel>
        <Field label="Icon style">
          <Select
            value={props.variant ?? "flat"}
            onValueChange={(v) =>
              patch({ variant: v as PaymentIconsProps["variant"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat (color)</SelectItem>
              <SelectItem value="outlined">Outlined (mono)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Alignment">
          <Select
            value={props.align ?? "end"}
            onValueChange={(v) =>
              patch({ align: v as PaymentIconsProps["align"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="end">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-3">
        <SectionLabel>Payment methods</SectionLabel>
        <p className="text-[10px] text-muted-foreground">
          Toggle which payment methods to display.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PAYMENT_METHODS.map((name) => {
            const on = enabledNames.has(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className={cn(
                  "rounded border px-2 py-1.5 text-xs text-left transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copyright Bar Inspector
// ---------------------------------------------------------------------------

export function CopyrightBarInspector({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const props = block.props as CopyrightBarProps;
  const patch = (partial: Partial<CopyrightBarProps>) =>
    updateBlockProps(block.id, { ...props, ...partial } as never);

  const items = props.items ?? [];
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionLabel>Copyright text</SectionLabel>
        <Field label="Text" hint={`Use ${currentYear} as the current year`}>
          <Input
            value={props.copy ?? ""}
            onChange={(e) => patch({ copy: e.target.value })}
            placeholder={`© ${currentYear}. All rights reserved.`}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <SectionLabel>Footer links</SectionLabel>
        <ToggleRow
          label="Show links"
          checked={props.showLinks !== false}
          onChange={(v) => patch({ showLinks: v })}
        />

        {props.showLinks !== false && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Links</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2"
                onClick={() =>
                  patch({ items: [...items, { label: "New", href: "/" }] })
                }
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {items.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
                No links yet.
              </div>
            )}

            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <NavItemRow
                  key={idx}
                  label={item.label}
                  href={item.href}
                  onChange={(label, href) => {
                    const next = [...items];
                    next[idx] = { label, href };
                    patch({ items: next });
                  }}
                  onRemove={() =>
                    patch({ items: items.filter((_, i) => i !== idx) })
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch map — used by BlockInspector to route block.kind → custom panel
// ---------------------------------------------------------------------------

export const CUSTOM_INSPECTOR_KINDS = new Set([
  "nav-bar",
  "logo-mark",
  "utility-bar",
  "footer-columns",
  "social-links",
  "payment-icons",
  "copyright-bar",
]);

export function CustomInspectorPanel({ block }: { block: BlockNode }) {
  switch (block.kind) {
    case "nav-bar":
      return <NavBarInspector block={block} />;
    case "logo-mark":
      return <LogoMarkInspector block={block} />;
    case "utility-bar":
      return <UtilityBarInspector block={block} />;
    case "footer-columns":
      return <FooterColumnsInspector block={block} />;
    case "social-links":
      return <SocialLinksInspector block={block} />;
    case "payment-icons":
      return <PaymentIconsInspector block={block} />;
    case "copyright-bar":
      return <CopyrightBarInspector block={block} />;
    default:
      return null;
  }
}
