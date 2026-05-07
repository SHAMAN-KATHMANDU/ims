"use client";

import React from "react";
import type { CatalogCategory } from "../../catalog/block-catalog";

interface BlockCategoryTabsProps {
  categories: readonly (CatalogCategory | "all")[];
  activeCategory: CatalogCategory | "all";
  onCategoryChange: (category: CatalogCategory | "all") => void;
}

const CATEGORY_LABELS: Record<CatalogCategory | "all", string> = {
  all: "All",
  layout: "Layout",
  content: "Content",
  commerce: "Commerce",
  marketing: "Marketing",
  pdp: "PDP",
  form: "Form",
  blog: "Blog",
};

export function BlockCategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: BlockCategoryTabsProps) {
  return (
    <div className="border-b border-gray-200 overflow-x-auto flex-shrink-0">
      <div className="flex gap-0 px-3 py-2 min-w-max">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
              activeCategory === category
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>
    </div>
  );
}
