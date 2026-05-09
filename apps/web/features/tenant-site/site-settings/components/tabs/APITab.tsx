"use client";

import { useState } from "react";
import { Plus, Copy, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  useApiKeys,
  useCreateApiKey,
  useRotateApiKey,
  useDeleteApiKey,
  type ApiKeyWithSecret,
} from "../../../hooks/use-api-keys";

export function APITab() {
  const { toast } = useToast();
  const { data: apiKeys, isLoading } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const rotateApiKey = useRotateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);

  const handleCreateApiKey = async () => {
    if (!createName.trim()) {
      toast({
        title: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: get actual tenantDomainId from context
      const result = await createApiKey.mutateAsync({
        name: createName.trim(),
        tenantDomainId: "default",
      });
      setCreatedKey(result);
      setShowNewKeyDialog(true);
      setCreateName("");
      setCreateOpen(false);
    } catch {
      toast({
        title: "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: "Copied to clipboard" });
  };

  const handleRotateApiKey = async (keyId: string) => {
    try {
      await rotateApiKey.mutateAsync({ id: keyId });
    } catch {
      toast({
        title: "Failed to rotate API key",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      await deleteApiKey.mutateAsync(keyId);
    } catch {
      toast({
        title: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading API keys…</div>
    );
  }

  const keys = apiKeys ?? [];

  return (
    <div className="space-y-6">
      {/* Create API Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <AlertDialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production API"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateApiKey}
                disabled={createApiKey.isPending}
              >
                {createApiKey.isPending ? "Creating…" : "Create key"}
              </Button>
            </div>
          </DialogContent>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>API key created</AlertDialogTitle>
              <AlertDialogDescription>
                Copy your API key now. You won&apos;t be able to see it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {createdKey && (
              <div className="space-y-3 py-4">
                <div className="p-3 rounded bg-muted">
                  <div className="font-mono text-sm break-all">
                    {createdKey.secret}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCopyToken(createdKey.secret)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to clipboard
                </Button>
              </div>
            )}
            <AlertDialogCancel>Done</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      </Dialog>

      {/* API Keys List */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">API keys</h3>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New key
          </Button>
        </div>

        {keys.length === 0 ? (
          <div className="text-sm text-muted-foreground">No API keys yet</div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="grid grid-cols-[1.4fr_120px_32px_32px] gap-3 items-center py-2 px-3 rounded border hover:bg-muted/30 transition-colors text-sm"
              >
                <div>
                  <div className="font-medium">{key.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {key.prefix}…
                  </div>
                </div>
                <span className="text-xs text-muted-foreground text-right">
                  {key.createdAt
                    ? new Date(key.createdAt).toLocaleDateString()
                    : "—"}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rotate API key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will invalidate the current key and issue a new
                        one.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRotateApiKey(key.id)}
                      >
                        {rotateApiKey.isPending ? "Rotating…" : "Rotate"}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete API key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately revoke access for any applications
                        using this key.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteApiKey(key.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteApiKey.isPending ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
