"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCollection,
  useUpdateCollection,
} from "../../../hooks/use-collections";
import type { Collection } from "../../../services/collections.service";

interface CollectionEditorDialogProps {
  collection?: Collection;
  onClose: () => void;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CollectionEditorDialog({
  collection,
  onClose,
}: CollectionEditorDialogProps) {
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [subtitle, setSubtitle] = useState(collection?.subtitle ?? "");

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return;

    if (collection) {
      await updateMutation.mutateAsync({
        id: collection.id,
        payload: {
          title,
          subtitle: subtitle || null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        title,
        slug: slugify(title),
        subtitle: subtitle || undefined,
      });
    }

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {collection ? "Edit collection" : "New collection"}
          </DialogTitle>
          {!collection && (
            <DialogDescription>
              Give it a name. You can add products afterwards.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="collection-title">Name</Label>
            <Input
              id="collection-title"
              placeholder="e.g. Summer drops"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-subtitle">Subtitle</Label>
            <Textarea
              id="collection-subtitle"
              placeholder="Shown beneath the title (optional)"
              value={subtitle ?? ""}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
