"use client";

import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/useToast";
import { ErrorDialog } from "./ErrorDialog";
import type { Product } from "@/features/products";

interface ProductDeleteDialogProps {
  product: Product | null;
  onClose: () => void;
  onDelete: (id: string, reason?: string) => Promise<void>;
}

export function ProductDeleteDialog({
  product,
  onClose,
  onDelete,
}: ProductDeleteDialogProps) {
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
    if (!product) return;
    setIsDeleting(true);
    try {
      await onDelete(product.id, reason);
      toast({ title: "Product deleted successfully" });
      onClose();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete product";
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
        open={!!product && !errorDialog.open}
        onOpenChange={(open) => !open && onClose()}
        itemName={product?.name}
        description={`This will move "${product?.name}" to trash. You can restore it within 30 days.`}
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
        title="Error Deleting Product"
        message={errorDialog.message}
        onGoBack={onClose}
      />
    </>
  );
}
