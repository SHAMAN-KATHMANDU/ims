"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import {
  useSnippets,
  useCreateSnippet,
  useDeleteSnippet,
} from "../hooks/use-snippets";
import { slugifyTitle } from "../validation";

function workspaceFromPath(pathname: string | null): string {
  if (!pathname) return "admin";
  return pathname.split("/").filter(Boolean)[0] ?? "admin";
}

export function SnippetsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const workspace = workspaceFromPath(pathname);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const query = useSnippets({ search: search || undefined, limit: 100 });
  const createMutation = useCreateSnippet();
  const deleteMutation = useDeleteSnippet();

  const items = query.data?.snippets ?? [];

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const snippet = await createMutation.mutateAsync({
        slug: slugifyTitle(title) || `snippet-${Date.now().toString(36)}`,
        title,
        body: [],
      });
      toast({ title: "Snippet created" });
      setNewTitle("");
      setCreating(false);
      router.push(`/${workspace}/content/snippets/${snippet.id}`);
    } catch (err) {
      toast({
        title: "Could not create snippet",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete snippet "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Snippet deleted" });
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Snippets"
        description="Reusable block sub-trees you can drop into any page or post. Edit once, render everywhere."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New snippet
          </Button>
        }
      />

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New snippet</CardTitle>
            <CardDescription>
              Give it a name. You&apos;ll edit the body next.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Promo strip — spring sale"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewTitle("");
                }
              }}
              aria-label="Snippet title"
            />
            <Button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newTitle.trim()}
            >
              Create
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or slug…"
            aria-label="Search snippets"
          />
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {query.isLoading
            ? "Loading…"
            : `${items.length} snippet${items.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!query.isLoading && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center space-y-2">
          <Sparkles
            className="mx-auto h-6 w-6 text-muted-foreground/60"
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold">No snippets yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Snippets are reusable block sub-trees. Create one and drop it into
            any page or post via the Snippet block.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Card key={s.id} className="group">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/${workspace}/content/snippets/${s.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="text-sm font-semibold leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">
                    /{s.slug}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id, s.title)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 grid place-items-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-muted/60"
                  aria-label="Delete"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              {s.category && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.category}
                </div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground">
                Updated {new Date(s.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
