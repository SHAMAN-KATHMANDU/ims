"use client";

import React from "react";
import type { BlueprintScope } from "../../catalog/scope-rules";
import type { SiteLayoutScope } from "@repo/shared";

interface BuiltInScopeListProps {
  scopes: BlueprintScope[];
  currentScope: SiteLayoutScope;
  onScopeChange: (scope: SiteLayoutScope) => void;
  search: string;
}

const SCOPE_LABELS: Record<BlueprintScope, string> = {
  header: "Header",
  footer: "Footer",
  home: "Home",
  "products-index": "Products",
  "product-detail": "Product Detail",
  cart: "Cart",
  "blog-index": "Blog Index",
  "blog-post": "Blog Post",
  offers: "Offers",
  contact: "Contact",
  page: "Custom Page",
  "404": "404 Page",
  landing: "Landing",
  "not-found": "Not Found",
};

export function BuiltInScopeList({
  scopes,
  currentScope,
  onScopeChange,
  search,
}: BuiltInScopeListProps) {
  const filtered = scopes.filter((scope) =>
    SCOPE_LABELS[scope].toLowerCase().includes(search.toLowerCase()),
  );

  if (filtered.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500">No matching pages</div>
    );
  }

  return (
    <div className="space-y-1 px-2 pb-2">
      {filtered.map((scope) => (
        <button
          key={scope}
          onClick={() => onScopeChange(scope)}
          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
            currentScope === scope
              ? "bg-blue-100 text-blue-700 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {SCOPE_LABELS[scope]}
        </button>
      ))}
    </div>
  );
}
