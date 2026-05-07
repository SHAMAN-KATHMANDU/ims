"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  useRedirects,
  useCreateRedirect,
  useDeleteRedirect,
  useUpdateRedirect,
} from "../../../hooks/use-redirects";
import type { TenantRedirect } from "../../../services/redirects.service";

export function RedirectsPanel() {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantRedirect | null>(null);
  const redirectsQuery = useRedirects();
  const createRedirect = useCreateRedirect();
  const deleteRedirect = useDeleteRedirect();
  const updateRedirect = useUpdateRedirect();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    deleteRedirect.mutate(id, {
      onSuccess: () => toast({ title: "Redirect deleted" }),
      onError: () =>
        toast({
          title: "Failed to delete redirect",
          variant: "destructive",
        }),
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground flex-1">
          Redirects
        </span>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus size={14} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add redirect</DialogTitle>
              <DialogDescription>
                Create a URL redirect rule. The source path must start with /.
              </DialogDescription>
            </DialogHeader>
            <AddRedirectForm
              onSuccess={() => setAddOpen(false)}
              onError={(msg) => {
                toast({
                  title: "Failed to create redirect",
                  description: msg,
                  variant: "destructive",
                });
              }}
              createMutation={createRedirect}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {redirectsQuery.isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading redirects…
          </div>
        )}

        {!redirectsQuery.isLoading &&
          (redirectsQuery.data?.length ?? 0) === 0 && (
            <div className="text-center py-8 rounded-lg border border-dashed border-border bg-muted/30">
              <ArrowRight className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <div className="text-sm font-medium text-foreground/80">
                No redirects yet
              </div>
              <div className="text-xs text-muted-foreground">
                Create one to automatically forward old URLs to new ones.
              </div>
            </div>
          )}

        {redirectsQuery.data?.map((redirect) => (
          <RedirectRow
            key={redirect.id}
            redirect={redirect}
            onDelete={handleDelete}
            onEdit={setEditTarget}
          />
        ))}
      </div>

      {editTarget && (
        <Dialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit redirect</DialogTitle>
            </DialogHeader>
            <EditRedirectForm
              redirect={editTarget}
              onSuccess={() => setEditTarget(null)}
              onError={(msg) => {
                toast({
                  title: "Failed to update redirect",
                  description: msg,
                  variant: "destructive",
                });
              }}
              updateMutation={updateRedirect}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddRedirectForm({
  onSuccess,
  onError,
  createMutation,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  createMutation: ReturnType<typeof useCreateRedirect>;
}) {
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState<"301" | "302">("301");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromPath.startsWith("/")) {
      onError("Source path must start with /");
      return;
    }
    if (!toPath.startsWith("/")) {
      onError("Destination path must start with /");
      return;
    }
    if (fromPath === toPath) {
      onError("Source and destination must differ");
      return;
    }
    createMutation.mutate(
      {
        fromPath: fromPath.trim(),
        toPath: toPath.trim(),
        statusCode: Number(statusCode) as 301 | 302,
        isActive: true,
      },
      {
        onSuccess: () => {
          setFromPath("");
          setToPath("");
          setStatusCode("301");
          onSuccess();
        },
        onError: (err) => {
          onError(err instanceof Error ? err.message : "Unknown error");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="redirect-from">From path</Label>
        <Input
          id="redirect-from"
          placeholder="/old-page"
          value={fromPath}
          onChange={(e) => setFromPath(e.target.value)}
          disabled={createMutation.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="redirect-to">To path</Label>
        <Input
          id="redirect-to"
          placeholder="/new-page"
          value={toPath}
          onChange={(e) => setToPath(e.target.value)}
          disabled={createMutation.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="redirect-code">Status code</Label>
        <Select
          value={statusCode}
          onValueChange={(v) => setStatusCode(v as "301" | "302")}
          disabled={createMutation.isPending}
        >
          <SelectTrigger id="redirect-code">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="301">301 (Permanent)</SelectItem>
            <SelectItem value="302">302 (Temporary)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFromPath("")}
          disabled={createMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create redirect"}
        </Button>
      </div>
    </form>
  );
}

function EditRedirectForm({
  redirect,
  onSuccess,
  onError,
  updateMutation,
}: {
  redirect: TenantRedirect;
  onSuccess: () => void;
  onError: (msg: string) => void;
  updateMutation: ReturnType<typeof useUpdateRedirect>;
}) {
  const [toPath, setToPath] = useState(redirect.toPath);
  const [statusCode, setStatusCode] = useState<"301" | "302">(
    String(redirect.statusCode) as "301" | "302",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toPath.startsWith("/")) {
      onError("Destination path must start with /");
      return;
    }
    updateMutation.mutate(
      {
        id: redirect.id,
        data: {
          toPath: toPath.trim(),
          statusCode: Number(statusCode) as 301 | 302,
        },
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err) => {
          onError(err instanceof Error ? err.message : "Unknown error");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>From path (read-only)</Label>
        <Input disabled value={redirect.fromPath} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-redirect-to">To path</Label>
        <Input
          id="edit-redirect-to"
          placeholder="/new-page"
          value={toPath}
          onChange={(e) => setToPath(e.target.value)}
          disabled={updateMutation.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-redirect-code">Status code</Label>
        <Select
          value={statusCode}
          onValueChange={(v) => setStatusCode(v as "301" | "302")}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger id="edit-redirect-code">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="301">301 (Permanent)</SelectItem>
            <SelectItem value="302">302 (Temporary)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save redirect"}
        </Button>
      </div>
    </form>
  );
}

function RedirectRow({
  redirect,
  onDelete,
  onEdit,
}: {
  redirect: TenantRedirect;
  onDelete: (id: string) => void;
  onEdit: (redirect: TenantRedirect) => void;
}) {
  return (
    <div className="p-3 rounded-md border border-border bg-card flex items-center gap-2 group">
      <div className="flex-1 min-w-0 text-xs">
        <div className="font-medium text-foreground truncate">
          {redirect.fromPath}
        </div>
        <div className="text-muted-foreground/60 text-[11px]">
          {redirect.statusCode} → {redirect.toPath}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition"
        onClick={() => onEdit(redirect)}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition"
        onClick={() => onDelete(redirect.id)}
      >
        <Trash2 size={12} />
      </Button>
    </div>
  );
}
