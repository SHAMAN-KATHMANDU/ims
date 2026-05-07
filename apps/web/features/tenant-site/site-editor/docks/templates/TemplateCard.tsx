"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteTemplate } from "../../hooks/useTemplatesQuery";

interface TemplateCardProps {
  template: SiteTemplate;
  isActive: boolean;
  onSelect: () => void;
}

export function TemplateCard({
  template,
  isActive,
  onSelect,
}: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-3 border rounded-lg text-left transition-all hover:border-blue-400 hover:bg-blue-50",
        isActive ? "border-green-500 bg-green-50" : "border-gray-200 bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail placeholder */}
        <div className="w-12 h-12 flex-shrink-0 rounded bg-gray-100 border border-gray-200" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {template.name}
            </h3>
            {isActive && (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </div>

          {template.description && (
            <p className="text-xs text-gray-500 truncate mt-1">
              {template.description}
            </p>
          )}

          {template.category && (
            <div className="mt-2">
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {template.category}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
