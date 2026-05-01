"use client";

/**
 * SlashMenu — Notion-style block inserter.
 *
 * Opens on `/` keypress (when no input/textarea is focused) or via the gutter
 * "+" button (P3 follow-up). Lists every block in `BLOCK_CATALOG_ENTRIES` for
 * the current scope, filterable by typing. On select, inserts a new block
 * after the currently-selected block, or appends to the root if nothing's
 * selected.
 *
 * Gated by EnvFeature.NOTION_STYLE_EDITOR — when off, the parent doesn't
 * mount this component, so the keydown listener never attaches.
 *
 * Pure parent-side React; does not depend on the iframe being same-origin
 * because everything happens via the editor store + the existing
 * insertSiblingOf / addBlock actions.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Search } from "lucide-react";
import {
  selectAddBlock,
  selectInsertSiblingOf,
  selectSelectedId,
  useEditorStore,
} from "./editor-store";
import {
  BLOCK_CATALOG,
  createBlockFromCatalog,
  listForScope,
  type CatalogEntry,
} from "./block-catalog";

interface Props {
  /** Current page scope (home / product-detail / page / etc.) — filters the list. */
  scope?: string;
  /** Optional toast callback for success feedback. */
  onInsert?: (entry: CatalogEntry) => void;
}

const ACTIVATION_KEY = "/";

/** True when an input/textarea/contentEditable element is focused. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function SlashMenu({ scope, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedId = useEditorStore(selectSelectedId);
  const insertSiblingOf = useEditorStore(selectInsertSiblingOf);
  const addBlock = useEditorStore(selectAddBlock);

  const entries = useMemo<CatalogEntry[]>(() => {
    return scope ? listForScope(scope) : [...BLOCK_CATALOG];
  }, [scope]);

  const filtered = useMemo<CatalogEntry[]>(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const hay = `${e.kind} ${e.label} ${e.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, filter]);

  // Global slash trigger (only when nothing's typing).
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== ACTIVATION_KEY) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (open) return;
      e.preventDefault();
      setOpen(true);
      setFilter("");
      setActiveIdx(0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input on open.
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [open]);

  // Clamp active index when the filtered list shrinks.
  useEffect(() => {
    if (activeIdx >= filtered.length) {
      setActiveIdx(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIdx]);

  const close = useCallback(() => {
    setOpen(false);
    setFilter("");
    setActiveIdx(0);
  }, []);

  const handleSelect = useCallback(
    (entry: CatalogEntry) => {
      const block = createBlockFromCatalog(entry);
      if (selectedId) {
        insertSiblingOf(selectedId, "after", block);
      } else {
        addBlock(block);
      }
      onInsert?.(entry);
      close();
    },
    [addBlock, close, insertSiblingOf, onInsert, selectedId],
  );

  const handleListKey = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const entry = filtered[activeIdx];
        if (entry) handleSelect(entry);
      }
    },
    [activeIdx, close, filtered, handleSelect],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Insert block"
      aria-modal="true"
      onKeyDown={handleListKey}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "start center",
        paddingTop: "12vh",
        background: "rgba(0,0,0,0.25)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          maxHeight: "70vh",
          background: "var(--popover, #fff)",
          color: "var(--popover-foreground, #111)",
          borderRadius: 10,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--border, #e5e7eb)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid var(--border, #e5e7eb)",
          }}
        >
          <Search size={14} aria-hidden="true" />
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Search blocks…"
            aria-label="Search blocks"
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              fontSize: 14,
              background: "transparent",
              color: "inherit",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-foreground, #6b7280)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 4,
              padding: "1px 5px",
            }}
            aria-hidden="true"
          >
            esc
          </span>
        </div>
        <div
          role="listbox"
          aria-label="Block catalog"
          style={{ overflowY: "auto", padding: 4 }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "16px 12px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--muted-foreground, #6b7280)",
              }}
            >
              No matches
            </div>
          ) : (
            filtered.map((entry, i) => {
              const active = i === activeIdx;
              return (
                <button
                  type="button"
                  // Multiple catalog entries can share a `kind` (e.g. preset
                  // variants of product-grid). Compose with index for unique
                  // React keys.
                  key={`${entry.kind}::${i}::${entry.label}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleSelect(entry)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    background: active
                      ? "var(--muted, #f3f4f6)"
                      : "transparent",
                    color: "inherit",
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {entry.label}
                  </span>
                  {entry.description && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground, #6b7280)",
                        lineHeight: 1.3,
                      }}
                    >
                      {entry.description}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
