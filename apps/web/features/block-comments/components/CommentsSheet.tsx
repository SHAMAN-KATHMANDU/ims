"use client";

/**
 * CommentsSheet — Phase 6 inline review threads.
 *
 * Generic over BLOG_POST / TENANT_PAGE: parents pass `recordType` +
 * `recordId` and the sheet handles list, create, resolve, reopen,
 * delete. Lives behind `CMS_REVIEW_WORKFLOW` — the parent gates on the
 * env flag and only mounts the sheet when on.
 */

import { useState } from "react";
import { MessageSquare, Check, RotateCcw, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import {
  useBlockComments,
  useCreateBlockComment,
  useResolveBlockComment,
  useReopenBlockComment,
  useDeleteBlockComment,
  type CommentRecordType,
} from "../hooks/use-block-comments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: CommentRecordType;
  recordId: string;
  recordLabel: string;
  /** Optional anchor; null means thread on the whole record. */
  blockId?: string | null;
}

function fmtDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function CommentsSheet({
  open,
  onOpenChange,
  recordType,
  recordId,
  recordLabel,
  blockId,
}: Props) {
  const { toast } = useToast();
  const [hideResolved, setHideResolved] = useState(false);
  const [draft, setDraft] = useState("");

  const query = useBlockComments(
    open
      ? { recordType, recordId, blockId: blockId ?? undefined, hideResolved }
      : null,
  );
  const createMutation = useCreateBlockComment();
  const resolveMutation = useResolveBlockComment();
  const reopenMutation = useReopenBlockComment();
  const deleteMutation = useDeleteBlockComment();

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    try {
      await createMutation.mutateAsync({
        recordType,
        recordId,
        blockId: blockId ?? null,
        body,
      });
      setDraft("");
    } catch (err) {
      toast({
        title: "Could not post",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const comments = query.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-hidden sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Comments
          </SheetTitle>
          <SheetDescription>
            Discussion on {recordLabel}
            {blockId ? ` (block ${blockId.slice(0, 8)}…)` : ""}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between px-6 py-2 border-b border-border">
          <Label
            htmlFor="hide-resolved"
            className="text-xs text-muted-foreground"
          >
            Hide resolved
          </Label>
          <Switch
            id="hide-resolved"
            checked={hideResolved}
            onCheckedChange={setHideResolved}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {query.isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!query.isLoading && comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No comments yet. Start the conversation below.
            </p>
          )}
          {comments.map((c) => (
            <article
              key={c.id}
              className={`rounded-md border p-3 space-y-2 ${
                c.resolvedAt
                  ? "border-border/40 bg-muted/30"
                  : "border-border bg-card"
              }`}
            >
              <header className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {c.authorId.slice(0, 8)}…
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {fmtDate(c.createdAt)}
                </span>
              </header>
              <p className="text-sm leading-snug whitespace-pre-wrap">
                {c.body}
              </p>
              <div className="flex items-center justify-end gap-1">
                {c.resolvedAt ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={reopenMutation.isPending}
                    onClick={() => void reopenMutation.mutateAsync(c.id)}
                  >
                    <RotateCcw
                      className="mr-1.5 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    Reopen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={resolveMutation.isPending}
                    onClick={() => void resolveMutation.mutateAsync(c.id)}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Resolve
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this comment?")) {
                      void deleteMutation.mutateAsync(c.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </article>
          ))}
        </div>

        <footer className="border-t border-border px-6 py-3 space-y-2 shrink-0">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave a comment…"
            rows={3}
            aria-label="New comment"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">⌘↩ to send</p>
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={createMutation.isPending || !draft.trim()}
            >
              {createMutation.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
