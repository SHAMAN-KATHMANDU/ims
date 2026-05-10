"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCollectionsCmsList,
  useUpdateCollectionCms,
  useSetCollectionCmsProducts,
} from "./use-collections-cms";
import { ProductPickerDialog } from "../components/ProductPickerDialog";
import { Plus } from "lucide-react";

export function CollectionsView() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const { data: collections = [], isLoading } = useCollectionsCmsList();
  const updateCollection = useUpdateCollectionCms();
  const setProducts = useSetCollectionCmsProducts();

  const active = collections.find((c) => c.id === activeId) || collections[0];

  const handleEditOpen = () => {
    if (active) {
      setEditTitle(active.title);
      setEditDialogOpen(true);
    }
  };

  const handleEditSave = () => {
    if (active) {
      updateCollection.mutate(
        { id: active.id, payload: { title: editTitle } },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
          },
        },
      );
    }
  };

  const handleSaveProducts = async (productIds: string[]) => {
    if (active) {
      setProducts.mutate({ id: active.id, productIds });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-3">
        Loading collections…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="text-sm text-ink-3 mt-1">
            Group products into shoppable collections.
          </p>
        </div>
        <Button className="gap-2 bg-accent text-bg hover:bg-accent/90">
          <Plus className="w-4 h-4" />
          New collection
        </Button>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-[260px_1fr] gap-4">
        {/* Collection List */}
        <div className="border border-line rounded-lg overflow-hidden bg-bg-elev">
          {collections.length === 0 ? (
            <div className="p-4 text-center text-sm text-ink-3">
              No collections yet
            </div>
          ) : (
            collections.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-line-2 transition-colors ${
                  active?.id === c.id ? "bg-bg-active" : "hover:bg-bg-sunken"
                }`}
              >
                <div className="text-sm font-medium text-ink">{c.title}</div>
                <div className="text-xs font-mono text-ink-4 mt-0.5">
                  {c.productIds?.length || 0} items
                </div>
              </button>
            ))
          )}
        </div>

        {/* Details */}
        {active && (
          <div className="space-y-4">
            {/* Collection Header */}
            <div className="border border-line rounded-lg p-4 bg-bg-elev space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-bg-sunken to-bg-active" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-ink">
                    {active.title}
                  </h2>
                  <div className="text-xs font-mono text-ink-4 mt-1">
                    /collections/{active.slug}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    Manage products
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEditOpen}>
                    Edit details
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="border border-line rounded-lg overflow-hidden bg-bg-elev">
              <div className="px-4 py-3 bg-bg-sunken border-b border-line text-xs font-mono text-ink-4 uppercase tracking-wide">
                <div className="grid grid-cols-[32px_80px_1fr_80px_90px_32px] gap-4">
                  <span />
                  <span />
                  <span>Name</span>
                  <span className="text-right">Price</span>
                  <span>SKU</span>
                  <span />
                </div>
              </div>

              {(active.products || []).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-3">
                  No products in this collection
                </div>
              ) : (
                (active.products || []).map((p) => (
                  <div
                    key={p.id}
                    className={`px-4 py-3 border-t border-line-2 grid grid-cols-[32px_80px_1fr_80px_90px_32px] gap-4 items-center hover:bg-bg-sunken transition-colors`}
                  >
                    <div className="text-ink-4">⋮</div>
                    <div className="w-9 h-9 rounded bg-gradient-to-br from-bg-sunken to-accent" />
                    <span className="text-sm font-medium text-ink">
                      {p.title}
                    </span>
                    <span className="font-mono text-sm text-ink text-right">
                      ${p.price}
                    </span>
                    <span className="font-mono text-xs text-ink-3">
                      {p.sku}
                    </span>
                    <button className="text-ink-4 hover:text-ink">⋯</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-2">
                Title
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateCollection.isPending}
            >
              {updateCollection.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Picker Dialog */}
      <ProductPickerDialog
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        initialProductIds={active?.productIds ?? []}
        onSave={handleSaveProducts}
        isSaving={setProducts.isPending}
        title="Manage Collection Products"
      />
    </div>
  );
}
