"use client";

import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { listForScope } from "../../catalog/block-catalog";
import { BlockCategoryTabs } from "./BlockCategoryTabs";
import { RecentBlocks } from "./RecentBlocks";
import { BlockTile } from "./BlockTile";
import type { CatalogCategory } from "../../catalog/block-catalog";

interface BlocksPanelProps {
  scope?: SiteLayoutScope;
}

export function BlocksPanel({ scope }: BlocksPanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | "all">(
    "all",
  );

  const scopedCatalog = useMemo(() => listForScope(scope), [scope]);

  // Get unique categories
  const categories = useMemo(
    () =>
      [
        "all",
        ...Array.from(new Set(scopedCatalog.map((b) => b.category))),
      ] as const,
    [scopedCatalog],
  );

  // Filter blocks by search and category
  const filteredBlocks = useMemo(() => {
    let result = scopedCatalog;

    if (activeCategory !== "all") {
      result = result.filter((b) => b.category === activeCategory);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.label.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q),
      );
    }

    return result;
  }, [activeCategory, search, scopedCatalog]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Search bar */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <BlockCategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Recent blocks (show only when "all" and no search) */}
      {activeCategory === "all" && !search && <RecentBlocks scope={scope} />}

      {/* Block grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No blocks found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredBlocks.map((block) => (
              <BlockTile key={block.kind} catalog={block} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
