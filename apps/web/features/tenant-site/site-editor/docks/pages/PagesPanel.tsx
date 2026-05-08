"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { BLUEPRINT_SCOPES } from "../../catalog/scope-rules";
import { BuiltInScopeList } from "./BuiltInScopeList";
import { CustomPagesList } from "./CustomPagesList";
import { BlogPostsList } from "./BlogPostsList";

interface PagesPanelProps {
  currentScope: SiteLayoutScope;
  onScopeChange: (scope: SiteLayoutScope) => void;
  workspace: string;
}

// Categorize scopes into three groups: header, page, footer
const SCOPE_GROUPS = {
  header: ["header"] as const,
  page: [
    "home",
    "products-index",
    "product-detail",
    "offers",
    "cart",
    "blog-index",
    "blog-post",
    "contact",
    "page",
    "404",
  ] as const,
  footer: ["footer"] as const,
};

type ScopeGroup = keyof typeof SCOPE_GROUPS;

function getCurrentGroup(scope: SiteLayoutScope): ScopeGroup {
  if (SCOPE_GROUPS.header.includes(scope as any)) return "header";
  if (SCOPE_GROUPS.footer.includes(scope as any)) return "footer";
  return "page";
}

export function PagesPanel({
  currentScope,
  onScopeChange,
  workspace,
}: PagesPanelProps) {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<ScopeGroup>(
    getCurrentGroup(currentScope),
  );

  const handleScopeChange = (scope: SiteLayoutScope) => {
    onScopeChange(scope);
    setSearch("");
    // Update active group if the new scope belongs to a different group
    const newGroup = getCurrentGroup(scope);
    if (newGroup !== activeGroup) {
      setActiveGroup(newGroup);
    }
  };

  const scopesInGroup = useMemo(
    () =>
      SCOPE_GROUPS[activeGroup].filter((s) =>
        BLUEPRINT_SCOPES.includes(s as SiteLayoutScope),
      ),
    [activeGroup],
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Scope group tabs (Header/Page/Footer) */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="flex">
          {(["header", "page", "footer"] as const).map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wide border-b-2 transition-colors ${
                activeGroup === group
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto">
        {/* Built-in scopes for the active group */}
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Pages
            </h3>
          </div>
          <BuiltInScopeList
            scopes={scopesInGroup}
            currentScope={currentScope}
            onScopeChange={handleScopeChange}
            search={search}
          />
        </div>

        {/* Custom pages — only in Page group */}
        {activeGroup === "page" && (
          <div className="border-b border-gray-200">
            <div className="px-3 py-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Custom Pages
              </h3>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Create custom page"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <CustomPagesList search={search} workspace={workspace} />
          </div>
        )}

        {/* Blog posts — only in Page group */}
        {activeGroup === "page" && (
          <div>
            <div className="px-3 py-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Blog Posts
              </h3>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Create blog post"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <BlogPostsList search={search} workspace={workspace} />
          </div>
        )}
      </div>
    </div>
  );
}
