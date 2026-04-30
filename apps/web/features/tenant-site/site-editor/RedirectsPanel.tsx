"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRedirects,
  useCreateRedirect,
  useDeleteRedirect,
  useUpdateRedirect,
} from "../hooks/use-redirects";
import type { TenantRedirect } from "../services/redirects.service";

function AddRedirectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateRedirect();
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fromPath.startsWith("/") || !toPath.startsWith("/")) {
      setError("Both paths must start with /");
      return;
    }
    if (fromPath === toPath) {
      setError("Source and destination must differ");
      return;
    }
    create.mutate(
      {
        fromPath: fromPath.trim(),
        toPath: toPath.trim(),
        statusCode,
        isActive: true,
      },
      {
        onSuccess: () => {
          setFromPath("");
          setToPath("");
          setStatusCode(301);
          onClose();
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Failed to create redirect";
          setError(msg);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="text-[14px] font-semibold">Add redirect</div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              From path
            </label>
            <input
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              placeholder="/old-page"
              className="w-full h-8 px-2.5 rounded border border-border bg-muted/40 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              To path
            </label>
            <input
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              placeholder="/new-page"
              className="w-full h-8 px-2.5 rounded border border-border bg-muted/40 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Type
            </label>
            <select
              value={statusCode}
              onChange={(e) =>
                setStatusCode(Number(e.target.value) as 301 | 302)
              }
              className="w-full h-8 px-2.5 rounded border border-border bg-muted/40 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value={301}>301 — Permanent</option>
              <option value={302}>302 — Temporary</option>
            </select>
          </div>
          {error && <p className="text-[11.5px] text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-8 rounded border border-border text-[12.5px] hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 h-8 rounded bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {create.isPending ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RedirectRow({ redirect }: { redirect: TenantRedirect }) {
  const deleteRedirect = useDeleteRedirect();
  const updateRedirect = useUpdateRedirect();

  const handleToggle = () => {
    updateRedirect.mutate({
      id: redirect.id,
      data: { isActive: !redirect.isActive },
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete redirect ${redirect.fromPath} → ${redirect.toPath}?`))
      return;
    deleteRedirect.mutate(redirect.id);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded-md transition-colors",
        redirect.isActive
          ? "bg-muted/30 hover:bg-muted/60"
          : "opacity-50 hover:opacity-70",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11.5px]">
          <span className="font-mono truncate text-foreground/80 max-w-[110px]">
            {redirect.fromPath}
          </span>
          <ArrowRight size={10} className="shrink-0 text-muted-foreground/60" />
          <span className="font-mono truncate text-foreground/80 max-w-[110px]">
            {redirect.toPath}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
          {redirect.statusCode} · {redirect.isActive ? "active" : "inactive"}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={handleToggle}
          className="h-6 w-6 grid place-items-center rounded hover:bg-muted text-muted-foreground"
          title={redirect.isActive ? "Deactivate" : "Activate"}
        >
          {redirect.isActive ? (
            <ToggleRight size={13} />
          ) : (
            <ToggleLeft size={13} />
          )}
        </button>
        <button
          onClick={handleDelete}
          className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/10 text-destructive/70"
          title="Delete redirect"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export function RedirectsPanel() {
  const [addOpen, setAddOpen] = useState(false);
  const query = useRedirects();

  const redirects = query.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Redirects
        </span>
        <button
          onClick={() => setAddOpen(true)}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
          title="Add redirect"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {query.isLoading && (
          <div className="text-center py-8 text-[12px] text-muted-foreground/60">
            Loading…
          </div>
        )}
        {!query.isLoading && redirects.length === 0 && (
          <div className="text-center py-8 text-[11.5px] text-muted-foreground/60">
            <p>No redirects yet.</p>
            <p className="mt-1">
              Add rules to forward old URLs to new ones (301/302).
            </p>
          </div>
        )}
        {redirects.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {redirects.map((r) => (
              <RedirectRow key={r.id} redirect={r} />
            ))}
          </div>
        )}
      </div>

      <AddRedirectDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
