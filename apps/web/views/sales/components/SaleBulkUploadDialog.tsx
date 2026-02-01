"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkUploadSales,
  downloadBulkUploadTemplate,
  type SaleBulkUploadResponse,
} from "@/services/salesService";
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
import { useToast } from "@/hooks/useToast";
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

interface SaleBulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleBulkUploadDialog({
  open,
  onOpenChange,
}: SaleBulkUploadDialogProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] =
    useState<SaleBulkUploadResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return bulkUploadSales(file, (progress) => {
        setUploadProgress(progress);
      });
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      if (data.summary.created > 0) {
        toast({
          title: "Bulk upload completed",
          description: `Successfully created ${data.summary.created} sale(s)`,
        });
      }
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to upload file";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setUploadProgress(0);
      setUploadResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
        "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
      },
      maxFiles: 1,
      maxSize: 10 * 1024 * 1024, // 10MB
    });

  const handleUpload = () => {
    if (!selectedFile) return;
    bulkUploadMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    if (bulkUploadMutation.isPending) return;

    setSelectedFile(null);
    setUploadProgress(0);
    setUploadResult(null);
    bulkUploadMutation.reset();
    onOpenChange(false);
  };

  const isUploading = bulkUploadMutation.isPending;
  const hasResult = uploadResult !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Sales</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to create multiple sales at once.
            Download the template to see required and optional column headers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
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
                        <X className="h-4 w-4 mr-2" />
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
                      Supports .xlsx, .xls, .xlsm files (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {fileRejections.length > 0 && fileRejections[0] && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>File rejected</AlertTitle>
              <AlertDescription>
                {fileRejections[0].errors.map((error) => (
                  <div key={error.code}>
                    {error.code === "file-too-large"
                      ? "File size exceeds 10MB limit"
                      : error.code === "file-invalid-type"
                        ? "Invalid file type. Only Excel files are allowed."
                        : error.message}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {hasResult && uploadResult && (
            <div className="space-y-4">
              <Alert
                variant={
                  uploadResult.summary.errors === 0 &&
                  uploadResult.summary.skipped === 0
                    ? "default"
                    : "destructive"
                }
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload Summary</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="font-medium">Total:</span>{" "}
                      {uploadResult.summary.total}
                    </div>
                    <div className="text-green-600">
                      <CheckCircle2 className="h-4 w-4 inline mr-1" />
                      <span className="font-medium">Created:</span>{" "}
                      {uploadResult.summary.created}
                    </div>
                    {uploadResult.summary.skipped > 0 && (
                      <div className="text-yellow-600">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        <span className="font-medium">Skipped:</span>{" "}
                        {uploadResult.summary.skipped}
                      </div>
                    )}
                    {uploadResult.summary.errors > 0 && (
                      <div className="text-red-600">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        <span className="font-medium">Errors:</span>{" "}
                        {uploadResult.summary.errors}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {uploadResult.created.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-600">
                    Successfully Created ({uploadResult.created.length})
                  </h4>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-1">
                      {uploadResult.created.map((sale, idx) => (
                        <div
                          key={idx}
                          className="text-xs flex items-center gap-2 text-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>
                            {sale.saleCode} ({sale.itemsCount} item
                            {sale.itemsCount !== 1 ? "s" : ""})
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {uploadResult.skipped.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-yellow-600">
                    Skipped ({uploadResult.skipped.length})
                  </h4>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-1">
                      {uploadResult.skipped.map((sale, idx) => (
                        <div
                          key={idx}
                          className="text-xs flex items-start gap-2 text-yellow-700"
                        >
                          <AlertCircle className="h-3 w-3 mt-0.5" />
                          <span>
                            <span className="font-medium">
                              {sale.saleId || "N/A"}
                            </span>
                            : {sale.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {uploadResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600">
                    Validation Errors ({uploadResult.errors.length})
                  </h4>
                  <ScrollArea className="h-48 rounded-md border p-2">
                    <div className="space-y-1">
                      {uploadResult.errors.map((error, idx) => (
                        <div
                          key={idx}
                          className="text-xs flex items-start gap-2 text-red-700"
                        >
                          <XCircle className="h-3 w-3 mt-0.5" />
                          <span>
                            <span className="font-medium">Row {error.row}</span>
                            {error.field && (
                              <span className="text-muted-foreground">
                                {" "}
                                ({error.field})
                              </span>
                            )}
                            : {error.message}
                            {error.value !== undefined && (
                              <span className="text-muted-foreground">
                                {" "}
                                (Value: {String(error.value)})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

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
                  <Download className="h-4 w-4 mr-2" />
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
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
