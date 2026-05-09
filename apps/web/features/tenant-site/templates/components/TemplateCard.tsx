"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { TemplateThumbnail } from "./TemplateThumbnail";
import type { SiteTemplate } from "../../services/tenant-site.service";

interface TemplateCardProps {
  template: SiteTemplate;
  isActive: boolean;
  onApply: (slug: string) => void;
}

export function TemplateCard({
  template,
  isActive,
  onApply,
}: TemplateCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="flex-shrink-0">
        <TemplateThumbnail slug={template.slug} />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        <div>
          <h3 className="text-lg font-serif text-gray-900">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {template.description}
            </p>
          )}
        </div>

        {/* Status and Action */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {isActive ? (
            <>
              <Badge variant="outline" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                Current
              </Badge>
              <Button size="sm" variant="outline" disabled className="flex-1">
                Active
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onApply(template.slug)}
              className="w-full"
            >
              Apply
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
