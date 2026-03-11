"use client";

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

interface BulkDeleteUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  currentUserId: string | undefined;
  onConfirm: (idsToDelete: string[]) => Promise<void>;
  isDeleting?: boolean;
}

export function BulkDeleteUsersDialog({
  open,
  onOpenChange,
  userIds,
  currentUserId,
  onConfirm,
  isDeleting = false,
}: BulkDeleteUsersDialogProps) {
  const idsToDelete = currentUserId
    ? userIds.filter((id) => id !== currentUserId)
    : userIds;
  const hasSelfInSelection =
    !!currentUserId && userIds.includes(currentUserId);
  const canDelete = idsToDelete.length > 0;

  const handleConfirm = async () => {
    await onConfirm(idsToDelete);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete users?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasSelfInSelection && !canDelete ? (
              <>You cannot delete your own account. Deselect yourself first.</>
            ) : hasSelfInSelection && canDelete ? (
              <>
                You cannot delete your own account. {idsToDelete.length} other
                user(s) will be deleted. This action cannot be undone.
              </>
            ) : (
              <>
                This will permanently delete {idsToDelete.length} user(s). This
                action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!canDelete || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
