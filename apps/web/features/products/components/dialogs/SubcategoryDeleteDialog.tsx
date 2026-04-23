"use client";

import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/useToast";
import { ErrorDialog } from "./ErrorDialog";

interface SubcategoryDeleteDialogProps {
  subcategoryName: string | null;
  categoryName: string | null;
  onClose: () => void;
  onDelete: (reason?: string) => Promise<void>;
}

export function SubcategoryDeleteDialog({
  subcategoryName,
  categoryName,
  onClose,
  onDelete,
}: SubcategoryDeleteDialogProps) {
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
    if (!subcategoryName) return;
    setIsDeleting(true);
    try {
      await onDelete(reason);
      toast({ title: "Subcategory deleted successfully" });
      onClose();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete subcategory";
      setErrorDialog({
        open: true,
        message: errorMessage,
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const description =
    subcategoryName && categoryName
      ? `This will move "${subcategoryName}" from category "${categoryName}" to trash. You can restore it within 30 days.`
      : subcategoryName
        ? `This will move "${subcategoryName}" to trash. You can restore it within 30 days.`
        : undefined;

  return (
    <>
      <DeleteConfirmDialog
        open={!!subcategoryName && !errorDialog.open}
        onOpenChange={(open) => !open && onClose()}
        itemName={subcategoryName ?? undefined}
        title="Are you sure?"
        description={description}
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
        title="Error Deleting Subcategory"
        message={errorDialog.message}
        onGoBack={onClose}
      />
    </>
  );
}
