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

interface SubcategoryDeleteDialogProps {
  subcategoryName: string | null;
  categoryName: string | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
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

  const handleDelete = async () => {
    if (!subcategoryName) return;
    setIsDeleting(true);
    try {
      await onDelete();
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
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AlertDialog
        open={!!subcategoryName && !errorDialog.open}
        onOpenChange={(open) => !open && onClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the subcategory &quot;
              {subcategoryName}&quot;
              {categoryName && ` from category "${categoryName}"`}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
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
        title="Error Deleting Subcategory"
        message={errorDialog.message}
        onGoBack={onClose}
      />
    </>
  );
}
