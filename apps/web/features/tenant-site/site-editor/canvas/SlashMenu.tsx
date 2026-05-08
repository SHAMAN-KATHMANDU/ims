/**
 * Slash menu for inserting blocks inline.
 * Opens when "/" is typed in a text field.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { selectInsertSiblingOf } from "../store/selectors";
import { listForScope } from "../catalog/block-catalog";
import type { CatalogEntry } from "@repo/shared";

interface SlashMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorId?: string;
  scope?: SiteLayoutScope;
}

export const SlashMenu = React.forwardRef<HTMLDivElement, SlashMenuProps>(
  ({ isOpen, onClose, anchorId, scope }, ref) => {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const insertSiblingOf = useEditorStore(selectInsertSiblingOf);

    const scopedCatalog = useMemo(() => listForScope(scope), [scope]);

    const filtered: readonly CatalogEntry[] = useMemo(
      () =>
        query
          ? scopedCatalog.filter(
              (e) =>
                e.label.toLowerCase().includes(query.toLowerCase()) ||
                e.description.toLowerCase().includes(query.toLowerCase()),
            )
          : scopedCatalog,
      [query, scopedCatalog],
    );

    const handleSelect = useCallback(
      (entry: CatalogEntry) => {
        if (!anchorId) return;
        const block = {
          id: `${entry.kind}-${crypto.randomUUID().slice(0, 8)}`,
          kind: entry.kind,
          props: entry.createDefaultProps ? entry.createDefaultProps() : {},
        };
        insertSiblingOf(anchorId, "after", block);
        onClose();
        setQuery("");
      },
      [anchorId, insertSiblingOf, onClose],
    );

    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filtered.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + filtered.length) % filtered.length,
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleSelect(filtered[selectedIndex] as CatalogEntry);
        } else if (e.key.length === 1) {
          setQuery((prev) => prev + e.key);
        } else if (e.key === "Backspace") {
          setQuery((prev) => prev.slice(0, -1));
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filtered, selectedIndex, onClose, handleSelect]);

    if (!isOpen || filtered.length === 0) return null;

    return (
      <div
        ref={ref}
        className="absolute top-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg max-w-xs max-h-96 overflow-y-auto z-1001"
      >
        <div className="sticky top-0 px-3 py-2 border-b bg-gray-50">
          <input
            autoFocus
            type="text"
            placeholder="Type to filter..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
          />
        </div>

        <div className="divide-y">
          {filtered.map((entry, idx) => (
            <button
              key={entry.kind}
              onClick={() => handleSelect(entry)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                idx === selectedIndex ? "bg-blue-100" : ""
              }`}
            >
              <div className="font-medium">{entry.label}</div>
              <div className="text-xs text-gray-500">{entry.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  },
);

SlashMenu.displayName = "SlashMenu";
