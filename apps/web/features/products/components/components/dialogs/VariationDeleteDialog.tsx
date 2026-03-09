"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/useToast";
import { ErrorDialog } from "./ErrorDialog";

interface VariationDeleteDialogProps {
  productName: string | null;
  variationImsCode: string | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export function VariationDeleteDialog({
  productName,
  variationImsCode,
  onClose,
  onDelete,
}: VariationDeleteDialogProps) {
  const { toast } = useToast();
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const isOpen = !!productName && !!variationImsCode;

  const handleDelete = async () => {
    if (!isOpen) return;
    setIsDeleting(true);
    try {
      await onDelete();
      toast({ title: "Variation deleted successfully" });
      onClose();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete variation";
      setErrorDialog({
        open: true,
        message: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AlertDialog
        open={isOpen && !errorDialog.open}
        onOpenChange={(open) => !open && onClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete variation{" "}
              <strong>{variationImsCode}</strong> from &quot;{productName}
              &quot;. The product and its other variations will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Variation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => {
          setErrorDialog({ ...errorDialog, open });
          if (!open) {
            onClose();
          }
        }}
        title="Error Deleting Variation"
        message={errorDialog.message}
        onGoBack={onClose}
      />
    </>
  );
}
