"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateActivity } from "@/features/crm/hooks/use-activities";
import { useToast } from "@/hooks/useToast";

interface LogActivityFormProps {
  contactId?: string;
  memberId?: string;
  dealId?: string;
  onSuccess?: () => void;
}

export function LogActivityForm({
  contactId,
  memberId,
  dealId,
  onSuccess,
}: LogActivityFormProps) {
  const { toast } = useToast();
  const [type, setType] = useState<"CALL" | "MEETING">("CALL");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [activityAt, setActivityAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );

  const createMutation = useCreateActivity();

  const canSubmit =
    (contactId || memberId || dealId) && (contactId || dealId || memberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({
        title: "Link to contact, member, or deal required",
        variant: "destructive",
      });
      return;
    }
    try {
      await createMutation.mutateAsync({
        type,
        subject: subject.trim() || undefined,
        notes: notes.trim() || undefined,
        activityAt,
        contactId,
        memberId,
        dealId,
      });
      setSubject("");
      setNotes("");
      setActivityAt(new Date().toISOString().slice(0, 16));
      toast({ title: "Activity logged" });
      onSuccess?.();
    } catch {
      toast({ title: "Failed to log activity", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-lg">
      <div>
        <Label>Type</Label>
        <Select
          value={type}
          onValueChange={(v: "CALL" | "MEETING") => setType(v)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="MEETING">Meeting</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Date & Time</Label>
        <Input
          type="datetime-local"
          value={activityAt}
          onChange={(e) => setActivityAt(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="mt-1"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={!canSubmit || createMutation.isPending}
      >
        Log Activity
      </Button>
    </form>
  );
}
