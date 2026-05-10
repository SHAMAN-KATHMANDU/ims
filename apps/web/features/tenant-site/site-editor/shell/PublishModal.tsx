/**
 * Publish modal.
 *
 * Confirms publish with a draft → published diff: blocks added, removed,
 * modified. Wires `usePublishLayout` so the publish call lives here, not in
 * the top bar (single primary action per surface).
 */

"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Pencil, Globe } from "lucide-react";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import { usePublishLayout } from "../hooks/useSiteLayoutMutations";

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  scope: SiteLayoutScope;
  /** Required when scope === "page": the TenantPage id whose SiteLayout
   *  draft is being promoted. Null/undefined for chrome scopes. */
  pageId?: string | null;
  draftBlocks: BlockNode[];
  publishedBlocks: BlockNode[] | null;
  /** Called only when publish succeeds, before `onClose`. Use it to bump
   *  the canvas refreshKey so the iframe reloads the published version. */
  onPublished?: () => void;
}

interface BlockDiff {
  added: number;
  removed: number;
  modified: number;
}

function flattenIds(blocks: BlockNode[]): Map<string, BlockNode> {
  const out = new Map<string, BlockNode>();
  const walk = (nodes: BlockNode[]): void => {
    for (const n of nodes) {
      out.set(n.id, n);
      if (n.children && n.children.length > 0) walk(n.children);
    }
  };
  walk(blocks);
  return out;
}

function diffBlocks(
  draft: BlockNode[],
  published: BlockNode[] | null,
): BlockDiff {
  if (!published) {
    return { added: flattenIds(draft).size, removed: 0, modified: 0 };
  }
  const d = flattenIds(draft);
  const p = flattenIds(published);
  let added = 0;
  let removed = 0;
  let modified = 0;
  for (const [id, draftNode] of d) {
    const pubNode = p.get(id);
    if (!pubNode) {
      added += 1;
      continue;
    }
    if (JSON.stringify(draftNode.props) !== JSON.stringify(pubNode.props)) {
      modified += 1;
    }
  }
  for (const id of p.keys()) {
    if (!d.has(id)) removed += 1;
  }
  return { added, removed, modified };
}

export function PublishModal({
  open,
  onClose,
  scope,
  pageId = null,
  draftBlocks,
  publishedBlocks,
  onPublished,
}: PublishModalProps) {
  const publish = usePublishLayout(scope, pageId);

  const diff = useMemo(
    () => diffBlocks(draftBlocks, publishedBlocks),
    [draftBlocks, publishedBlocks],
  );

  const isClean = diff.added === 0 && diff.removed === 0 && diff.modified === 0;

  const handlePublish = async (): Promise<void> => {
    await publish.mutateAsync();
    onPublished?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Publish {scope}
          </DialogTitle>
          <DialogDescription>
            {isClean
              ? "No changes since last publish — publishing will republish the current state."
              : "Review what will go live, then publish."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <DiffRow
            icon={<Plus className="h-4 w-4 text-green-600" />}
            label="Added"
            count={diff.added}
          />
          <DiffRow
            icon={<Minus className="h-4 w-4 text-red-600" />}
            label="Removed"
            count={diff.removed}
          />
          <DiffRow
            icon={<Pencil className="h-4 w-4 text-amber-600" />}
            label="Modified"
            count={diff.modified}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={publish.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={publish.isPending}>
            {publish.isPending ? "Publishing…" : "Publish now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
      <div className="flex items-center gap-2 text-gray-700">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-gray-900">{count}</span>
    </div>
  );
}
