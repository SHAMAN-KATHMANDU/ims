"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApplyTemplate } from "../hooks/use-templates";
import type { SiteTemplate } from "../../services/tenant-site.service";

interface ApplyTemplateConfirmDialogProps {
  template: SiteTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyTemplateConfirmDialog({
  template,
  open,
  onOpenChange,
}: ApplyTemplateConfirmDialogProps) {
  const applyMutation = useApplyTemplate();

  const handleApply = async () => {
    await applyMutation.mutateAsync(template.slug);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Apply &ldquo;{template.name}&rdquo; template?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Applying this template will replace your home, header, footer, and
            cart layouts. Your existing draft layouts will be saved as version
            snapshots. Custom pages are preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
          Changes to layout and theme will be applied but not published until
          you save and publish.
        </div>

        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApply}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? "Applying..." : "Apply template"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
