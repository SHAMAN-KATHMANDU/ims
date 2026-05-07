"use client";

/**
 * Inline page editor — a modal overlay that hosts the existing
 * `TenantPageEditor` so users can create or edit a custom page without
 * leaving the site editor canvas. Replaces the previous main's
 * `PageEditorWorkspace` (which took over the whole canvas) with a
 * dialog so the canvas stays visible behind it.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTenantPage, TenantPageEditor } from "@/features/tenant-pages";
import type { TenantPage as TenantPageModel } from "@/features/tenant-pages";

export type PageEditorTarget =
  | { mode: "new" }
  | { mode: "edit"; pageId: string };

interface PageEditorDialogProps {
  target: PageEditorTarget | null;
  onClose: () => void;
  onCreated?: (page: TenantPageModel) => void;
}

export function PageEditorDialog({
  target,
  onClose,
  onCreated,
}: PageEditorDialogProps) {
  const pageQuery = useTenantPage(
    target?.mode === "edit" ? target.pageId : null,
  );
  if (!target) return null;
  const page = target.mode === "edit" ? (pageQuery.data ?? null) : null;
  const loading = target.mode === "edit" && pageQuery.isLoading;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>
            {target.mode === "new" ? "New custom page" : "Edit page"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                Loading page…
              </div>
            ) : (
              <TenantPageEditor
                page={page}
                onBack={onClose}
                onCreated={(p) => {
                  onCreated?.(p);
                  onClose();
                }}
                disablePreview
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
