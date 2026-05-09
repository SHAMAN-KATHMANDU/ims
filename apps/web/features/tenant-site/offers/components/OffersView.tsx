"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useOffersStore, selectOffers, selectDeleteOffer } from "../store";
import { OfferEditorDialog } from "./OfferEditorDialog";
import type { Offer } from "../types";

export function OffersView() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const offers = useOffersStore(selectOffers);
  const deleteOffer = useOffersStore(selectDeleteOffer);

  const activeOffers = offers.filter((o) => o.status === "active").length;
  const totalRedemptions = offers.reduce((sum, o) => sum + o.uses, 0);
  const estimateRevenue = (totalRedemptions * 85).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteOffer(id);
  };

  const handleCloseEditor = () => {
    setEditingOffer(null);
    setEditorOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Offers & promos"
        description="Promo codes, special events, and limited-time menus."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Open in POS
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingOffer(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New offer
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Active offers
          </div>
          <div className="text-2xl font-semibold">{activeOffers}</div>
          <div className="text-xs text-muted-foreground">
            {activeOffers === 0 ? "No active offers" : "1 ending soon"}
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Redemptions this week
          </div>
          <div className="text-2xl font-semibold">{totalRedemptions}</div>
          <div className="text-xs text-muted-foreground">+34% vs last week</div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Revenue from promos
          </div>
          <div className="text-2xl font-semibold">{estimateRevenue}</div>
          <div className="text-xs text-muted-foreground">
            {totalRedemptions} covers
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <div className="w-24">Code</div>
          <div className="flex-1">Title</div>
          <div className="w-20">Type</div>
          <div className="w-32">Value</div>
          <div className="w-24">Status</div>
          <div className="w-20 text-right">Uses</div>
          <div className="w-32">Window</div>
          <div className="w-8" />
        </div>
        {offers.map((offer) => (
          <OfferRow
            key={offer.id}
            offer={offer}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </Card>

      <OfferEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        offer={editingOffer}
        onClose={handleCloseEditor}
      />
    </div>
  );
}

interface OfferRowProps {
  offer: Offer;
  onEdit: (offer: Offer) => void;
  onDelete: (id: string) => void;
}

function OfferRow({ offer, onEdit, onDelete }: OfferRowProps) {
  return (
    <div className="border-t px-4 py-3 flex items-center gap-2 text-sm hover:bg-muted/30 transition-colors">
      <div className="w-24 font-mono text-xs bg-muted rounded px-2 py-1 w-fit">
        {offer.code}
      </div>
      <div className="flex-1 font-medium">{offer.title}</div>
      <div className="w-20 text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
        {offer.type}
      </div>
      <div className="w-32 text-sm text-muted-foreground">{offer.value}</div>
      <div className="w-24">
        <span
          className={`text-xs px-2 py-1 rounded ${
            offer.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : offer.status === "scheduled"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : offer.status === "ended"
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}
        >
          {offer.status}
        </span>
      </div>
      <div className="w-20 text-right font-mono text-xs text-muted-foreground">
        {offer.uses}
        {offer.cap ? ` / ${offer.cap}` : ""}
      </div>
      <div className="w-32 text-xs text-muted-foreground">{offer.window}</div>
      <div className="w-8 flex justify-center">
        <button
          className="p-1.5 hover:bg-muted rounded transition-colors"
          onClick={() => onEdit(offer)}
        >
          <svg
            className="w-3.5 h-3.5 text-muted-foreground"
            fill="currentColor"
            viewBox="0 0 4 16"
          >
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
