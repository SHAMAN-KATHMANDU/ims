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
import { useToast } from "@/hooks/useToast";
import { usePickSiteTemplate } from "../../hooks/useTemplatesQuery";
import type { SiteTemplate } from "../../hooks/useTemplatesQuery";

interface ApplyTemplateConfirmProps {
  template: SiteTemplate;
  onClose: () => void;
}

export function ApplyTemplateConfirm({
  template,
  onClose,
}: ApplyTemplateConfirmProps) {
  const { toast } = useToast();
  const pickMutation = usePickSiteTemplate();

  const handleApply = async () => {
    try {
      await pickMutation.mutateAsync({
        templateSlug: template.slug,
        resetBranding: false,
      });
      toast({ title: "Template applied" });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to apply template",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Apply &quot;{template.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will reset the layout and theme tokens. Your branding (logo,
            name) and products are preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
          Changes to layout and theme will be applied but not published until
          you save.
        </div>

        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApply}
            disabled={pickMutation.isPending}
          >
            {pickMutation.isPending ? "Applying..." : "Apply"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
