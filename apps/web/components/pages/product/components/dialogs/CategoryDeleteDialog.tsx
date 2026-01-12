"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { ErrorDialog } from "./ErrorDialog"
import type { Category } from "@/hooks/useProduct"

interface CategoryDeleteDialogProps {
  category: Category | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}

export function CategoryDeleteDialog({ category, onClose, onDelete }: CategoryDeleteDialogProps) {
  const { toast } = useToast()
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!category) return
    setIsDeleting(true)
    try {
      await onDelete(category.id)
      toast({ title: "Category deleted successfully" })
      onClose()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete category"
      setErrorDialog({
        open: true,
        message: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <AlertDialog open={!!category && !errorDialog.open} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{category?.name}". This action cannot be undone.
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
          setErrorDialog({ ...errorDialog, open })
          if (!open) {
            onClose()
          }
        }}
        title="Error Deleting Category"
        message={errorDialog.message}
        onGoBack={onClose}
      />
    </>
  )
}

