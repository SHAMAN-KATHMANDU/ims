"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  useUnpublishSite,
  useResetToTemplate,
} from "../../../hooks/use-site-mutations";
import { useTemplatesQuery } from "../../../hooks/use-templates-query";
import { useSiteConfig } from "../../../hooks/use-tenant-site";

export function DangerZonePanel() {
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const { toast } = useToast();
  const unpublishMutation = useUnpublishSite();
  const resetMutation = useResetToTemplate();
  const templatesQuery = useTemplatesQuery();
  const _siteQuery = useSiteConfig();

  const handleUnpublish = async () => {
    try {
      await unpublishMutation.mutateAsync();
      setUnpublishOpen(false);
      toast({ title: "Site unpublished" });
    } catch (error) {
      toast({
        title: "Failed to unpublish",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleResetToTemplate = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Select a template",
        variant: "destructive",
      });
      return;
    }
    if (
      !confirm(
        "This will reset your layout and theme to the selected template. Branding and custom pages will be preserved. Continue?",
      )
    ) {
      return;
    }
    try {
      await resetMutation.mutateAsync(selectedTemplate);
      setResetOpen(false);
      setSelectedTemplate("");
      toast({ title: "Site reset to template" });
    } catch (error) {
      toast({
        title: "Failed to reset",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Danger zone
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Unpublish */}
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 dark:bg-destructive/10 p-4 space-y-3">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                Unpublish your site
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your site will no longer be accessible at your custom domain.
              </p>
            </div>
          </div>

          <Dialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full">
                Unpublish site
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unpublish your site?</DialogTitle>
                <DialogDescription>
                  Your site will no longer be accessible to visitors. You can
                  republish anytime.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUnpublishOpen(false)}
                  disabled={unpublishMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleUnpublish}
                  disabled={unpublishMutation.isPending}
                >
                  {unpublishMutation.isPending ? "Unpublishing…" : "Unpublish"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reset to template */}
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 dark:bg-destructive/10 p-4 space-y-3">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                Reset to template
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Replace your current layout and theme with a fresh template.
                Branding and custom pages are preserved.
              </p>
            </div>
          </div>

          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full">
                Reset to template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset to template</DialogTitle>
                <DialogDescription>
                  Select a template to apply. Your layout and theme will be
                  replaced, but branding and pages are kept.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Choose a template
                  </label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                    disabled={
                      templatesQuery.isLoading || resetMutation.isPending
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesQuery.data?.map((template) => (
                        <SelectItem key={template.id} value={template.slug}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResetOpen(false);
                      setSelectedTemplate("");
                    }}
                    disabled={resetMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleResetToTemplate}
                    disabled={resetMutation.isPending || !selectedTemplate}
                  >
                    {resetMutation.isPending ? "Resetting…" : "Reset"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
