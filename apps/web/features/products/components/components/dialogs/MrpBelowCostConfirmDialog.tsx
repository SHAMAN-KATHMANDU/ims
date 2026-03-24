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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

const CONFIRM_TOKEN = "confirm";

interface MrpBelowCostConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function MrpBelowCostConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: MrpBelowCostConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canSubmit = typed.trim().toLowerCase() === CONFIRM_TOKEN;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" allowDismiss={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden
            />
            <DialogTitle>Unusual pricing</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-1">
            Cost price is higher than MRP. Only continue if this is intentional
            (for example, loss leaders or data entry you have verified).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="mrp-below-cp-confirm">
            Type <span className="font-mono font-medium">{CONFIRM_TOKEN}</span>{" "}
            to proceed
          </Label>
          <Input
            id="mrp-below-cp-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={CONFIRM_TOKEN}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleConfirm}>
            Confirm pricing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
