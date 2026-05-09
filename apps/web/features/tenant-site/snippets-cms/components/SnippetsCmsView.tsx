"use client";

import type React from "react";
import { useState } from "react";
import { Plus, Code, Blocks, Trash2, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Empty,
  EmptyMedia,
  EmptyContent,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSnippetsList,
  useCreateSnippet,
  useDeleteSnippet,
} from "../hooks/use-snippets-cms";
import type { SnippetItem } from "../types";

export function SnippetsCmsView() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const snippetsQuery = useSnippetsList({ search });
  const deleteSnippet = useDeleteSnippet();
  const { toast } = useToast();

  const snippets = snippetsQuery.data?.snippets ?? [];

  const handleDelete = (snippet: SnippetItem): void => {
    if (!confirm(`Delete "${snippet.name}"?`)) return;
    deleteSnippet.mutate(snippet.id, {
      onSuccess: () => toast({ title: "Snippet deleted" }),
      onError: () =>
        toast({
          title: "Failed to delete snippet",
          variant: "destructive",
        }),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Snippets"
        description="Reusable content blocks. Edit once, update everywhere."
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Code className="h-4 w-4 mr-2" />
              New code snippet
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New snippet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create snippet</DialogTitle>
                  <DialogDescription>
                    Create a new reusable snippet to use across pages.
                  </DialogDescription>
                </DialogHeader>
                <CreateSnippetForm onSuccess={() => setCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {snippetsQuery.isLoading && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading snippets…
        </div>
      )}

      {!snippetsQuery.isLoading && snippets.length === 0 && (
        <Empty>
          <EmptyMedia variant="icon">
            <Blocks className="h-6 w-6" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No snippets yet</EmptyTitle>
            <EmptyDescription>
              Create a reusable snippet to get started.
            </EmptyDescription>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New snippet
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {snippets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search snippets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {snippets.map((snippet) => (
                <SnippetRow
                  key={snippet.id}
                  snippet={snippet}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateSnippetForm({
  onSuccess,
}: {
  onSuccess: () => void;
}): React.ReactElement {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"html" | "block">("block");
  const createMutation = useCreateSnippet();
  const { toast } = useToast();

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim() || !slug.trim()) {
      toast({
        title: "Missing required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        type,
        content: type === "block" ? [] : "",
      });
      toast({ title: "Snippet created" });
      onSuccess();
    } catch (error) {
      toast({
        title: "Failed to create snippet",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Name</label>
        <Input
          placeholder="Hours block"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={createMutation.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Slug</label>
        <Input
          placeholder="hours-block"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={createMutation.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Type</label>
        <div className="flex gap-2">
          {(["block", "html"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                type === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
              disabled={createMutation.isPending}
            >
              {t === "block" ? "Block" : "HTML"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          disabled={createMutation.isPending}
          onClick={() => {
            setName("");
            setSlug("");
          }}
        >
          Clear
        </Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create snippet"}
        </Button>
      </div>
    </div>
  );
}

function SnippetRow({
  snippet,
  onDelete,
}: {
  snippet: SnippetItem;
  onDelete: (snippet: SnippetItem) => void;
}): React.ReactElement {
  const typeIcon = snippet.type === "html" ? Code : Blocks;
  const TypeIcon = typeIcon;

  return (
    <Link href={`./snippets/${snippet.id}`}>
      <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded border border-border bg-muted flex items-center justify-center shrink-0">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{snippet.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {snippet.uses} uses · Updated {snippet.updatedAt}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
            {snippet.type}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(snippet);
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Link>
  );
}
