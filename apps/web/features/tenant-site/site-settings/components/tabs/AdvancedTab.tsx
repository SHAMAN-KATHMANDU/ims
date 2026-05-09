"use client";

import { History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

const PUBLISH_HISTORY = [
  {
    id: "v1",
    version: 156,
    publishedBy: "Mira K.",
    publishedAt: "2 hours ago",
    changes: "Updated home hero image",
  },
  {
    id: "v2",
    version: 155,
    publishedBy: "Devon R.",
    publishedAt: "4 hours ago",
    changes: "Added new menu section",
  },
  {
    id: "v3",
    version: 154,
    publishedBy: "Sasha P.",
    publishedAt: "yesterday",
    changes: "Updated contact info",
  },
];

const ANALYTICS_CONFIG = {
  ga4Id: "G-XXXXXXXXXX",
  gtmId: "GTM-XXXXXXXX",
};

export function AdvancedTab() {
  const { toast } = useToast();

  const handleRestore = (version: number) => {
    toast({ title: `Restored to version ${version}` });
  };

  const handleDeleteSite = () => {
    toast({
      title: "Site deletion initiated",
      description: "This action cannot be undone.",
      variant: "destructive",
    });
  };

  const handleResetBlocks = () => {
    toast({
      title: "Blocks reset",
      description: "All block customizations have been reverted.",
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

        <div className="space-y-2">
          {PUBLISH_HISTORY.map((entry) => (
            <div
              key={entry.id}
              className="p-3 border rounded hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">
                    v{entry.version}
                  </span>
                  <span className="text-sm ml-2">{entry.changes}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRestore(entry.version)}
                >
                  Restore
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.publishedBy} · {entry.publishedAt}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Analytics */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Analytics & tracking</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ga4">Google Analytics 4 ID</Label>
            <Input
              id="ga4"
              type="password"
              value={ANALYTICS_CONFIG.ga4Id}
              readOnly
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gtm">Google Tag Manager ID</Label>
            <Input
              id="gtm"
              type="password"
              value={ANALYTICS_CONFIG.gtmId}
              readOnly
              className="font-mono text-sm"
            />
          </div>
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
