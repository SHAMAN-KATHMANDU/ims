"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  usePromosQuery,
  usePromoAnalytics,
  useDeletePromo,
} from "../../hooks/use-promos";
import type { PromoCode } from "../../services/promos.service";
import { OfferEditorDialog } from "./OfferEditorDialog";

export function OffersView() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const promosQuery = usePromosQuery();
  const analyticsQuery = usePromoAnalytics();
  const deletePromo = useDeletePromo();

  const promos = promosQuery.data?.promos ?? [];
  const analytics = analyticsQuery.data;

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingPromo(null);
    setEditorOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Offers & promos"
        description="Promo codes, special events, and limited-time offers."
        actions={
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingPromo(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New promo
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Active promos
          </div>
          <div className="text-2xl font-semibold">
            {analyticsQuery.isLoading ? "—" : (analytics?.activePromos ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {analyticsQuery.isLoading ? "Loading…" : "Active now"}
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Total redeemed
          </div>
          <div className="text-2xl font-semibold">
            {analyticsQuery.isLoading ? "—" : (analytics?.totalRedeemed ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {analyticsQuery.isLoading ? "Loading…" : "All time"}
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Total discount
          </div>
          <div className="text-2xl font-semibold">
            {analyticsQuery.isLoading
              ? "—"
              : (analytics?.totalDiscount ?? 0).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
          </div>
          <div className="text-xs text-muted-foreground">
            {analyticsQuery.isLoading ? "Loading…" : "All time"}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <div className="w-24">Code</div>
          <div className="flex-1">Description</div>
          <div className="w-20">Type</div>
          <div className="w-24">Value</div>
          <div className="w-24">Status</div>
          <div className="w-20 text-right">Uses</div>
          <div className="w-32">Valid</div>
          <div className="w-8" />
        </div>

        {promosQuery.isLoading && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading promos…
          </div>
        )}

        {!promosQuery.isLoading && promos.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No promos yet. Create one to get started.
          </div>
        )}

        {promos.map((promo: PromoCode) => (
          <PromoRow
            key={promo.id}
            promo={promo}
            onEdit={handleEdit}
            onDelete={() => deletePromo.mutate(promo.id)}
            isDeleting={deletePromo.isPending}
          />
        ))}
      </Card>

      <OfferEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        promo={editingPromo}
        onClose={handleCloseEditor}
      />
    </div>
  );
}

interface PromoRowProps {
  promo: PromoCode;
  onEdit: (promo: PromoCode) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function PromoRow({ promo, onEdit, isDeleting }: PromoRowProps) {
  const valueDisplay =
    promo.valueType === "PERCENTAGE" ? `${promo.value}%` : `$${promo.value}`;
  const validFrom = promo.validFrom
    ? new Date(promo.validFrom).toLocaleDateString()
    : "—";
  const validTo = promo.validTo
    ? new Date(promo.validTo).toLocaleDateString()
    : "—";

  return (
    <div className="border-t px-4 py-3 flex items-center gap-2 text-sm hover:bg-muted/30 transition-colors">
      <div className="w-24 font-mono text-xs bg-muted rounded px-2 py-1">
        {promo.code}
      </div>
      <div className="flex-1 text-muted-foreground truncate">
        {promo.description || "—"}
      </div>
      <div className="w-20 text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
        {promo.valueType}
      </div>
      <div className="w-24 text-sm font-semibold">{valueDisplay}</div>
      <div className="w-24">
        <span
          className={`text-xs px-2 py-1 rounded inline-block ${
            promo.isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
          }`}
        >
          {promo.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="w-20 text-right font-mono text-xs text-muted-foreground">
        {promo.usageCount}
        {promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
      </div>
      <div className="w-32 text-xs text-muted-foreground">
        {validFrom} → {validTo}
      </div>
      <div className="w-8 flex justify-center gap-1">
        <button
          className="p-1.5 hover:bg-muted rounded transition-colors"
          onClick={() => onEdit(promo)}
          disabled={isDeleting}
          aria-label="Edit promo"
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
