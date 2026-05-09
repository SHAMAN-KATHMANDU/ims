"use client";

import { History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/useToast";
import {
  usePublishHistory,
  useRollbackPublish,
} from "../../../hooks/use-publish-history";
import {
  useSiteAnalytics,
  useUpdateSiteAnalytics,
} from "../../../hooks/use-tenant-site";

export function AdvancedTab() {
  const { toast } = useToast();
  const { data: publishHistory } = usePublishHistory();
  const rollbackPublish = useRollbackPublish();
  const { data: analytics } = useSiteAnalytics();
  const _updateAnalytics = useUpdateSiteAnalytics();

  const handleRestore = async (versionId: string) => {
    try {
      await rollbackPublish.mutateAsync(versionId);
      toast({ title: "Restored to previous version" });
    } catch {
      toast({
        title: "Failed to restore version",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSite = () => {
    // TODO: implement site deletion
    toast({
      title: "Site deletion not yet available",
      variant: "destructive",
    });
  };

  const handleResetBlocks = () => {
    // TODO: implement block reset
    toast({
      title: "Block reset not yet available",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      {/* Publish history */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5" />
          <h3 className="font-semibold">Publish history</h3>
        </div>

        {!publishHistory || publishHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No publish history yet
          </div>
        ) : (
          <div className="space-y-2">
            {publishHistory.map((entry) => (
              <div
                key={entry.id}
                className="p-3 border rounded hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-sm">
                      {entry.summary || "Published"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(entry.id)}
                    disabled={rollbackPublish.isPending}
                  >
                    {rollbackPublish.isPending ? "Restoring…" : "Restore"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.publishedBy && `${entry.publishedBy} · `}
                  {new Date(entry.publishedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Analytics */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Analytics & tracking</h3>
        <div className="space-y-3">
          {analytics?.ga4MeasurementId && (
            <div className="p-3 rounded border border-dashed text-xs text-muted-foreground">
              GA4: {analytics.ga4MeasurementId}
            </div>
          )}
          {analytics?.gtmContainerId && (
            <div className="p-3 rounded border border-dashed text-xs text-muted-foreground">
              GTM: {analytics.gtmContainerId}
            </div>
          )}
          {!analytics?.ga4MeasurementId && !analytics?.gtmContainerId && (
            <div className="text-sm text-muted-foreground">
              No analytics configured
            </div>
          )}
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="p-6 space-y-4 border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-destructive">Danger zone</h3>
        </div>

        <div className="space-y-3">
          <div className="p-3 border border-destructive/20 rounded bg-background space-y-2">
            <div className="text-sm font-medium">Reset all blocks</div>
            <p className="text-xs text-muted-foreground">
              Revert all block customizations to the template defaults. This
              cannot be undone.
            </p>
            <Button size="sm" variant="destructive" onClick={handleResetBlocks}>
              Reset blocks
            </Button>
          </div>

          <div className="p-3 border border-destructive/20 rounded bg-background space-y-2">
            <div className="text-sm font-medium">Delete site</div>
            <p className="text-xs text-muted-foreground">
              Permanently delete this website and all its content. This cannot
              be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  Delete site
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete site?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your website and all its
                    content. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSite}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </div>
  );
}
