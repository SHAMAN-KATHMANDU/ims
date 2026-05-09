"use client";

import { useEffect, useState } from "react";
import {
  useTopbarActionsStore,
  selectTopbarActionsSetActions,
} from "@/store/topbar-actions-store";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTemplatesQuery } from "../hooks/use-templates";
import { useSiteConfig } from "../../hooks/use-tenant-site";
import { TemplateCard } from "./TemplateCard";
import { ApplyTemplateConfirmDialog } from "./ApplyTemplateConfirmDialog";

export function TemplatesView() {
  const setTopbarActions = useTopbarActionsStore(selectTopbarActionsSetActions);
  const templatesQuery = useTemplatesQuery();
  const configQuery = useSiteConfig();
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null);

  useEffect(() => {
    setTopbarActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href="#" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Browse Theme Marketplace
          </a>
        </Button>
        {configQuery.data?.template && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <span className="text-sm text-gray-600">
              Current:{" "}
              <span className="font-medium">
                {configQuery.data.template.name}
              </span>
            </span>
          </div>
        )}
      </div>,
    );

    return () => setTopbarActions(null);
  }, [setTopbarActions, configQuery.data?.template]);

  if (templatesQuery.isLoading || configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  const templates = templatesQuery.data ?? [];
  const currentTemplateId = configQuery.data?.template?.id;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-gray-900">Templates</h1>
        <p className="text-gray-600 mt-2">
          Choose a template to get started with a pre-designed site layout and
          theme.
        </p>
      </div>

      {/* Grid of templates — 3 columns with gap-4 per spacing rule */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.slug}
              template={template}
              isActive={template.id === currentTemplateId}
              onApply={() => setConfirmTemplate(template.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-96 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-600">No templates available</p>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmTemplate && (
        <ApplyTemplateConfirmDialog
          template={templates.find((t) => t.slug === confirmTemplate)!}
          open={!!confirmTemplate}
          onOpenChange={(open) => {
            if (!open) setConfirmTemplate(null);
          }}
        />
      )}
    </div>
  );
}
