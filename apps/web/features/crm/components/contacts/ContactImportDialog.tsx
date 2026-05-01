"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UseMutationResult } from "@tanstack/react-query";

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mutation: UseMutationResult<
    { created: number; total: number },
    Error,
    File,
    unknown
  >;
}

export function ContactImportDialog({
  open,
  onOpenChange,
  onSuccess,
  mutation,
}: ContactImportDialogProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      mutation.mutate(file, {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err) => {
          if (process.env.NODE_ENV !== "production") {
            console.error(err);
          }
        },
      });
    },
    [mutation, onSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    disabled: mutation.isPending,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent allowDismiss={false}>
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: firstName, lastName, email, phone,
            companyName
          </DialogDescription>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
        >
          <input {...getInputProps()} />
          {mutation.isPending ? (
            <p>Importing...</p>
          ) : (
            <p className="text-muted-foreground">
              {isDragActive
                ? "Drop the file here"
                : "Drag & drop a CSV file here, or click to select"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
