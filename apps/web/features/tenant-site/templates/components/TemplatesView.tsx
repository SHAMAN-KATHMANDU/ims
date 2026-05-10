"use client";

import { useEffect, useState } from "react";
import {
  useTopbarActionsStore,
  selectTopbarActionsSetActions,
} from "@/store/topbar-actions-store";
import { useAuthStore, selectTenant } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import {
  useTemplatesQuery,
  useForkTemplate,
  useDeleteTemplate,
} from "../hooks/use-templates";
import { useSiteConfig } from "../../hooks/use-tenant-site";
import { TemplateCard } from "./TemplateCard";
import { ApplyTemplateConfirmDialog } from "./ApplyTemplateConfirmDialog";

export function TemplatesView() {
  const setTopbarActions = useTopbarActionsStore(selectTopbarActionsSetActions);
  const tenant = useAuthStore(selectTenant);
  const templatesQuery = useTemplatesQuery();
  const configQuery = useSiteConfig();
  const forkMutation = useForkTemplate();
  const deleteMutation = useDeleteTemplate();
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setTopbarActions(
      configQuery.data?.template ? (
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <span className="text-sm text-gray-600">
            Current:{" "}
            <span className="font-medium">
              {configQuery.data.template.name}
            </span>
          </span>
        </div>
      ) : null,
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
              key={template.id}
              template={template}
              isActive={template.id === currentTemplateId}
              currentTenantId={tenant?.id ?? ""}
              onApply={() => setConfirmTemplate(template.slug)}
              onForkClick={(id, name) => {
                forkMutation.mutate({ id, name });
              }}
              onEditClick={(id) => {
                window.location.href = `/site/templates/${id}/edit`;
              }}
              onDeleteClick={(id) => {
                setDeleteConfirm(id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-96 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-600">No templates available</p>
        </div>
      )}

      {/* Apply template confirmation dialog */}
      {confirmTemplate && (
        <ApplyTemplateConfirmDialog
          template={templates.find((t) => t.slug === confirmTemplate)!}
          open={!!confirmTemplate}
          onOpenChange={(open) => {
            if (!open) setConfirmTemplate(null);
          }}
        />
      )}

      {/* Delete fork confirmation dialog */}
      {deleteConfirm && (
        <AlertDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirm(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogTitle>Delete Fork?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your custom template fork will be
              permanently deleted.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteMutation.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
