"use client";

import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/useToast";
import { ErrorDialog } from "./ErrorDialog";
import type { Category } from "@/features/products";

interface CategoryDeleteDialogProps {
  category: Category | null;
  onClose: () => void;
  onDelete: (id: string, reason?: string) => Promise<void>;
}

export function CategoryDeleteDialog({
  category,
  onClose,
  onDelete,
}: CategoryDeleteDialogProps) {
  const { toast } = useToast();
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async (reason?: string) => {
    if (!category) return;
    setIsDeleting(true);
    try {
      await onDelete(category.id, reason);
      toast({ title: "Category deleted successfully" });
      onClose();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete category";
      setErrorDialog({
        open: true,
        message: errorMessage,
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DeleteConfirmDialog
        open={!!category && !errorDialog.open}
        onOpenChange={(open) => !open && onClose()}
        itemName={category?.name}
        description={`This will move "${category?.name}" to trash. You can restore it within 30 days.`}
        showReasonField={true}
        onConfirm={handleConfirm}
        onCancel={onClose}
        isLoading={isDeleting}
      />

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => {
          setErrorDialog((prev) => ({ ...prev, open }));
          if (!open) {
            onClose();
          }
        }}
        title="Error Deleting Category"
        message={errorDialog.message}
        onGoBack={onClose}
      />
    </>
  );
}
