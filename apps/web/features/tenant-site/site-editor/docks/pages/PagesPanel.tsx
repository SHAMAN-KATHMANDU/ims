"use client";

import React, { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { BLUEPRINT_SCOPES } from "../../catalog/scope-rules";
import { BuiltInScopeList } from "./BuiltInScopeList";
import { CustomPagesList } from "./CustomPagesList";
import { BlogPostsList } from "./BlogPostsList";

interface PagesPanelProps {
  currentScope: SiteLayoutScope;
  onScopeChange: (scope: SiteLayoutScope) => void;
}

export function PagesPanel({ currentScope, onScopeChange }: PagesPanelProps) {
  const [search, setSearch] = useState("");

  const handleScopeChange = (scope: SiteLayoutScope) => {
    onScopeChange(scope);
    setSearch("");
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
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

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto">
        {/* Built-in scopes */}
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Built-in
            </h3>
          </div>
          <BuiltInScopeList
            scopes={[...BLUEPRINT_SCOPES]}
            currentScope={currentScope}
            onScopeChange={handleScopeChange}
            search={search}
          />
        </div>

        {/* Custom pages */}
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
          <CustomPagesList search={search} />
        </div>

        {/* Blog posts */}
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
          <BlogPostsList search={search} />
        </div>
      </div>
    </div>
  );
}
