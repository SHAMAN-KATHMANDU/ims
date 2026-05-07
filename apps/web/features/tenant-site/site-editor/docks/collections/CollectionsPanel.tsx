"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  useCollections,
  useDeleteCollection,
} from "../../../hooks/use-collections";
import type { Collection } from "../../../services/collections.service";
import { CollectionEditorDialog } from "./CollectionEditorDialog";

export function CollectionsPanel() {
  const collectionsQuery = useCollections();
  const deleteCollectionMutation = useDeleteCollection();
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm("Delete this collection?")) {
      await deleteCollectionMutation.mutateAsync(id);
    }
  };

  const collections = collectionsQuery.data ?? [];

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Toolbar */}
      <Button
        onClick={() => setShowNewDialog(true)}
        className="w-full"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Collection
      </Button>

      {/* Table */}
      {collections.length > 0 ? (
        <div className="flex-1 overflow-y-auto border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((col) => (
                <TableRow key={col.id}>
                  <TableCell className="text-sm font-medium">
                    {col.title}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {col.productCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCollection(col)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(col.id)}
                        disabled={deleteCollectionMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-500">
          No collections yet
        </div>
      )}

      {/* Editor dialog */}
      {showNewDialog && (
        <CollectionEditorDialog onClose={() => setShowNewDialog(false)} />
      )}

      {editingCollection && (
        <CollectionEditorDialog
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
        />
      )}
    </div>
  );
}
