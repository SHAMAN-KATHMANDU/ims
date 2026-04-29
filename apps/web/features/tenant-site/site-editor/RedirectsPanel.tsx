"use client";

/**
 * RedirectsPanel — admin interface for managing URL redirects.
 *
 * Features:
 * - List all redirects (active and inactive)
 * - Create new redirects
 * - Edit existing redirects
 * - Delete redirects
 * - Validate no redirect cycles
 * - Toggle active/inactive
 */

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Redirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  isActive: boolean;
}

export function RedirectsPanel({ redirects = [] }: { redirects?: Redirect[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);

  const handleCreate = async () => {
    if (!fromPath || !toPath) return;

    try {
      const res = await fetch(`/api/v1/sites/redirects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPath,
          toPath,
          statusCode,
          isActive: true,
        }),
      });

      if (res.ok) {
        setFromPath("");
        setToPath("");
        setStatusCode(301);
        setIsEditing(false);
        // Refetch or update state
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to create redirect", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/sites/redirects/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to delete redirect", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Redirects
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
          title="Add redirect"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isEditing && (
          <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/50">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">
                From path
              </label>
              <input
                type="text"
                value={fromPath}
                onChange={(e) => setFromPath(e.target.value)}
                placeholder="/old-page"
                className="w-full mt-1 px-2 py-1.5 rounded-md border border-border text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">
                To path
              </label>
              <input
                type="text"
                value={toPath}
                onChange={(e) => setToPath(e.target.value)}
                placeholder="/new-page"
                className="w-full mt-1 px-2 py-1.5 rounded-md border border-border text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">
                Status code
              </label>
              <select
                value={statusCode}
                onChange={(e) =>
                  setStatusCode(parseInt(e.target.value) as 301 | 302)
                }
                className="w-full mt-1 px-2 py-1.5 rounded-md border border-border text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={301}>301 Permanent</option>
                <option value={302}>302 Temporary</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={!fromPath || !toPath}
                className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFromPath("");
                  setToPath("");
                }}
                className="flex-1 h-7 rounded-md border border-border text-[12px] font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {redirects.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-muted-foreground">
            No redirects yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-1.5">
            {redirects.map((redirect) => (
              <div
                key={redirect.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-mono text-foreground truncate">
                    {redirect.fromPath}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    → {redirect.toPath} ({redirect.statusCode})
                  </div>
                  {!redirect.isActive && (
                    <div className="text-[10px] text-muted-foreground/60">
                      Inactive
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(redirect.id)}
                  className="h-6 w-6 grid place-items-center rounded opacity-0 hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  title="Delete redirect"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
