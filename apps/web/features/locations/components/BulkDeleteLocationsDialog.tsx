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

interface BulkDeleteLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationIds: string[];
  onConfirm: (ids: string[]) => Promise<void>;
  isDeleting?: boolean;
}

export function BulkDeleteLocationsDialog({
  open,
  onOpenChange,
  locationIds,
  onConfirm,
  isDeleting = false,
}: BulkDeleteLocationsDialogProps) {
  const canDelete = locationIds.length > 0;

  const handleConfirm = async () => {
    await onConfirm(locationIds);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate locations?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate {locationIds.length} location(s). They will no
            longer be available for new transfers. This action cannot be undone.
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
            {isDeleting ? "Deactivating..." : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
