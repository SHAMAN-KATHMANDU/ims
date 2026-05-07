"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useSiteTemplates,
  usePickSiteTemplate,
  type SiteTemplate,
} from "../../hooks/useTemplatesQuery";
import { TemplateCard } from "./TemplateCard";
import { ApplyTemplateConfirm } from "./ApplyTemplateConfirm";

interface TemplatesPanelProps {
  activeTemplateId?: string | null;
}

export function TemplatesPanel({ activeTemplateId }: TemplatesPanelProps) {
  const templatesQuery = useSiteTemplates();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<SiteTemplate | null>(
    null,
  );

  const templates = useMemo(
    () => templatesQuery.data ?? [],
    [templatesQuery.data],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase() ?? "").includes(q)
      );
    });
  }, [templates, query, category]);

  const handleReset = () => {
    setQuery("");
    setCategory(null);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search templates..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              !category
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                category === cat
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((template) => (
              <TemplateCard
                key={template.slug}
                template={template}
                isActive={template.slug === activeTemplateId}
                onSelect={() => setConfirmTemplate(template)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="text-sm text-gray-500">
            {templates.length === 0 ? "No templates available" : "No matches"}
            {(query || category) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={handleReset}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmTemplate && (
        <ApplyTemplateConfirm
          template={confirmTemplate}
          onClose={() => setConfirmTemplate(null)}
        />
      )}
    </div>
  );
}
