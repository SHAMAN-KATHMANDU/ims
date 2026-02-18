"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { createErrorReport } from "@/services/errorReportService";
import { useToast } from "@/hooks/useToast";
import { Loader2, Bug } from "lucide-react";

interface ReportErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportErrorDialog({
  open,
  onOpenChange,
}: ReportErrorDialogProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setPageUrl(window.location.href ?? pathname ?? "");
    }
  }, [open, pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createErrorReport({
        title: title.trim(),
        description: description.trim() || undefined,
        pageUrl: pageUrl.trim() || undefined,
      });
      toast({ title: "Error report submitted. Thank you." });
      setTitle("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to submit report",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Report an error
          </DialogTitle>
          <DialogDescription>
            Describe what went wrong. This helps us fix issues quickly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">Title *</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Checkout failed"
              maxLength={255}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-description">Description (optional)</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you doing when the error occurred?"
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-url">Page URL (optional)</Label>
            <Input
              id="report-url"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="Auto-filled with current page"
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
