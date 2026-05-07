"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SiteTemplate } from "../../hooks/useTemplatesQuery";

interface TemplatePreviewDialogProps {
  template: SiteTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Preview iframe placeholder */}
        <div className="flex-1 border rounded bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">
            Preview — iframe would render /preview/site/home with template
            applied
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
