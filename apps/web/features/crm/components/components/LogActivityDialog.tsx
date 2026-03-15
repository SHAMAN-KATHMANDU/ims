"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateActivity } from "../../hooks/use-activities";
import { contactKeys } from "../../hooks/use-contacts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";

type ActivityType = "CALL" | "EMAIL" | "MEETING";

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ActivityType;
  contactId: string;
  onSuccess?: () => void;
}

const TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Log Call",
  EMAIL: "Log Email",
  MEETING: "Log Meeting",
};

export function LogActivityDialog({
  open,
  onOpenChange,
  type,
  contactId,
  onSuccess,
}: LogActivityDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const createMutation = useCreateActivity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        type,
        subject: subject.trim() || undefined,
        notes: notes.trim() || undefined,
        contactId,
        activityAt: new Date().toISOString(),
      });
      setSubject("");
      setNotes("");
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
      toast({ title: `${TYPE_LABELS[type]} logged` });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: `Failed to log ${type.toLowerCase()}`,
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSubject("");
      setNotes("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" allowDismiss={false}>
        <DialogHeader>
          <DialogTitle>{TYPE_LABELS[type]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Logging..." : TYPE_LABELS[type]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
