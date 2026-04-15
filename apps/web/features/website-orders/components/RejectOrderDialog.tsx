"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { RejectOrderFormSchema } from "../validation";
import { useRejectWebsiteOrder } from "../hooks/use-website-orders";

export function RejectOrderDialog({
  orderId,
  orderCode,
  open,
  onOpenChange,
  onRejected,
}: {
  orderId: string | null;
  orderCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected?: () => void;
}) {
  const { toast } = useToast();
  const rejectMutation = useRejectWebsiteOrder();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const handleReject = async () => {
    if (!orderId) return;
    const parsed = RejectOrderFormSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid reason");
      return;
    }
    setError(null);
    try {
      await rejectMutation.mutateAsync({ id: orderId, data: parsed.data });
      toast({ title: `Order ${orderCode} rejected` });
      onRejected?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Reject failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject order {orderCode}</DialogTitle>
          <DialogDescription>
            The customer won&apos;t be notified automatically. Write a short
            internal note so the rest of the team knows why.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Spam call / duplicate / customer cancelled over phone…"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? "Rejecting…" : "Reject order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
