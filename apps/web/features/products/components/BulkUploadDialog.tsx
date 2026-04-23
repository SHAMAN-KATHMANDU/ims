"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useBulkUploadProducts } from "@/features/products";
import { downloadBulkUploadTemplate } from "@/features/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, render content only (no Dialog). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  inline = false,
}: BulkUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    mutation: bulkUploadMutation,
    uploadProgress,
    uploadResult,
    reset,
    isUploading,
  } = useBulkUploadProducts();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && acceptedFiles[0]) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        reset();
      }
    },
    [reset],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
        "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
        "text/csv": [".csv"],
        "application/csv": [".csv"],
        "text/plain": [".csv"],
      },
      maxFiles: 1,
      maxSize: 10 * 1024 * 1024, // 10MB
    });

  const handleUpload = () => {
    if (!selectedFile) return;
    bulkUploadMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    if (isUploading) return; // Don't close during upload

    setSelectedFile(null);
    reset();
    onOpenChange(false);
  };

  const hasResult = uploadResult !== null;

  const content = (
    <>
      {!inline && (
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
            Bulk Upload Products
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to create or update products with
            location-based stock. Each row is one variant with its own product
            code and stock. Add attribute columns (e.g. <strong>Color</strong>,{" "}
            <strong>Size</strong>, <strong>Material</strong>) directly as
            headers — any column not matching a predefined field is
            automatically treated as a product attribute. Include the{" "}
            <strong>Location</strong> column (showroom/warehouse name or ID).
            Download the template for required columns.
          </DialogDescription>
        </DialogHeader>
      )}
      {inline && (
        <div className="space-y-1 mb-4">
          <h2 className="text-2xl font-semibold">Bulk Upload Products</h2>
          <p className="text-muted-foreground text-sm">
            Upload an Excel or CSV file to create or update products with
            location-based stock. Each row is one variant with its own product
            code. Add attribute columns (e.g. Color, Size, Material) directly as
            headers — any column not matching a predefined field is
            automatically treated as a product attribute. Include the Location
            column. Download the template for required columns.
          </p>
        </div>
      )}

      <div className="space-y-4 min-w-0 overflow-hidden">
        {/* File Dropzone */}
        {!hasResult && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              isUploading && "opacity-50 cursor-not-allowed",
            )}
          >
            <input {...getInputProps()} disabled={isUploading} />
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <FileSpreadsheet
                  className="h-8 w-8 text-primary"
                  aria-hidden="true"
                />
              </div>
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" aria-hidden="true" />
                      Remove
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? "Drop the file here"
                      : "Drag & drop an Excel file here, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .xlsx, .xls, .xlsm, .csv files (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Rejection Errors */}
        {fileRejections.length > 0 && fileRejections[0] && (
          <Alert variant="destructive" className="overflow-hidden">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <AlertTitle>File rejected</AlertTitle>
            <AlertDescription className="break-words min-w-0">
              {fileRejections[0].errors.map((error) => (
                <div key={error.code}>
                  {error.code === "file-too-large"
                    ? "File size exceeds 10MB limit"
                    : error.code === "file-invalid-type"
                      ? "Invalid file type. Only Excel (.xlsx, .xls, .xlsm) or CSV (.csv) files are allowed."
                      : error.message}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Error (e.g. wrong/missing columns) */}
        {bulkUploadMutation.isError && bulkUploadMutation.error ? (
          <Alert variant="destructive" className="overflow-hidden">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription className="space-y-2 break-words overflow-auto max-h-48 min-w-0">
              <p>{(bulkUploadMutation.error as Error).message}</p>
              {(
                bulkUploadMutation.error as Error & {
                  responseData?: { missingColumns?: string[]; hint?: string };
                }
              ).responseData?.missingColumns && (
                <p className="text-sm">
                  <span className="font-medium">Missing columns: </span>
                  {(
                    bulkUploadMutation.error as Error & {
                      responseData?: { missingColumns?: string[] };
                    }
                  ).responseData!.missingColumns!.join(", ")}
                </p>
              )}
              {(
                bulkUploadMutation.error as Error & {
                  responseData?: { hint?: string };
                }
              ).responseData?.hint && (
                <p className="text-sm text-muted-foreground">
                  {
                    (
                      bulkUploadMutation.error as Error & {
                        responseData?: { hint?: string };
                      }
                    ).responseData!.hint
                  }
                </p>
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress
              value={uploadProgress}
              aria-label={`Upload progress: ${uploadProgress}%`}
            />
          </div>
        )}

        {/* Upload Result — single scrollable box so all four sections fit */}
        {hasResult && uploadResult && (
          <ScrollArea className="max-h-[420px] w-full max-w-full min-w-0 overflow-x-hidden rounded-lg border">
            <div className="space-y-3 p-3 min-w-0 overflow-hidden">
              {/* Summary */}
              <Alert
                variant={
                  uploadResult.summary.errors === 0 &&
                  uploadResult.summary.skipped === 0
                    ? "default"
                    : "destructive"
                }
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <AlertTitle>Upload Summary</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                    <div>
                      <span className="font-medium">Total:</span>{" "}
                      {uploadResult.summary.total}
                    </div>
                    <div className="text-green-600">
                      <CheckCircle2
                        className="h-3 w-3 inline mr-1"
                        aria-hidden="true"
                      />
                      <span className="font-medium">Created:</span>{" "}
                      {uploadResult.summary.created}
                    </div>
                    {(uploadResult.summary.updated ?? 0) > 0 && (
                      <div className="text-blue-600">
                        <CheckCircle2
                          className="h-3 w-3 inline mr-1"
                          aria-hidden="true"
                        />
                        <span className="font-medium">Updated:</span>{" "}
                        {uploadResult.summary.updated}
                      </div>
                    )}
                    {uploadResult.summary.skipped > 0 && (
                      <div className="text-yellow-600">
                        <AlertCircle
                          className="h-3 w-3 inline mr-1"
                          aria-hidden="true"
                        />
                        <span className="font-medium">Skipped:</span>{" "}
                        {uploadResult.summary.skipped}
                      </div>
                    )}
                    {uploadResult.summary.errors > 0 && (
                      <div className="text-red-600">
                        <XCircle
                          className="h-3 w-3 inline mr-1"
                          aria-hidden="true"
                        />
                        <span className="font-medium">Errors:</span>{" "}
                        {uploadResult.summary.errors}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* 1. Successfully Created */}
              {uploadResult.created.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-green-600 shrink-0">
                    Successfully Created ({uploadResult.created.length})
                  </h4>
                  <div className="h-16 min-w-0 overflow-y-auto overflow-x-hidden rounded border bg-muted/30 p-2">
                    <div className="space-y-0.5 text-xs text-green-700 min-w-0">
                      {uploadResult.created.map((product, idx) => (
                        <div
                          key={idx}
                          className="flex min-w-0 items-center gap-1.5"
                        >
                          <CheckCircle2
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 truncate">
                            {(product as { imsCode?: string }).imsCode ??
                              product.name}{" "}
                            – {product.name} ({product.variationsCount} var
                            {product.variationsCount !== 1 ? "s" : ""})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Inventory Updated */}
              {uploadResult.updated?.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-blue-600 shrink-0">
                    Inventory Updated ({uploadResult.updated.length})
                  </h4>
                  <div className="h-16 min-w-0 overflow-y-auto overflow-x-hidden rounded border bg-muted/30 p-2">
                    <div className="space-y-0.5 text-xs text-blue-700 min-w-0">
                      {uploadResult.updated.map((product, idx) => (
                        <div
                          key={idx}
                          className="flex min-w-0 items-center gap-1.5"
                        >
                          <CheckCircle2
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 truncate">
                            {(product as { imsCode?: string }).imsCode ??
                              product.name}{" "}
                            – {product.name} at{" "}
                            {product.locations?.join(", ") ?? "—"} (
                            {product.inventoryRowsUpdated} row
                            {product.inventoryRowsUpdated !== 1 ? "s" : ""})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Skipped */}
              {uploadResult.skipped.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-yellow-600 shrink-0">
                    Skipped ({uploadResult.skipped.length})
                  </h4>
                  <div className="h-16 min-w-0 overflow-y-auto overflow-x-hidden rounded border bg-muted/30 p-2">
                    <div className="space-y-0.5 text-xs text-yellow-700 min-w-0">
                      {uploadResult.skipped.map((product, idx) => (
                        <div
                          key={idx}
                          className="flex min-w-0 items-center gap-1.5"
                        >
                          <AlertCircle
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 truncate">
                            {(product as { imsCode?: string }).imsCode ??
                              product.name}{" "}
                            – {product.name}: {product.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Validation Errors */}
              {uploadResult.errors.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-red-600 shrink-0">
                    Validation Errors ({uploadResult.errors.length})
                  </h4>
                  <div className="h-16 min-w-0 overflow-y-auto overflow-x-hidden rounded border bg-muted/30 p-2">
                    <div className="space-y-0.5 text-xs text-red-700 min-w-0">
                      {uploadResult.errors.map((error, idx) => (
                        <div
                          key={idx}
                          className="flex min-w-0 items-center gap-1.5"
                        >
                          <XCircle
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 truncate">
                            Row {error.row}
                            {error.field ? ` (${error.field})` : ""}:{" "}
                            {error.message}
                            {error.value !== undefined &&
                              ` (${String(error.value)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {hasResult ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => downloadBulkUploadTemplate()}
                disabled={isUploading}
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Download template
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                Upload
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (inline) {
    return <div className="max-w-3xl">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]" allowDismiss={false}>
        {content}
      </DialogContent>
    </Dialog>
  );
}
