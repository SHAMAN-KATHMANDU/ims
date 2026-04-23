"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useCreateActivity } from "../hooks/use-activities";
import { useToast } from "@/hooks/useToast";
import { LogActivitySchema, type LogActivityInput } from "../validation";

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
  const createMutation = useCreateActivity();

  const form = useForm<LogActivityInput>({
    resolver: zodResolver(LogActivitySchema),
    mode: "onBlur",
    defaultValues: {
      type: "CALL",
      subject: "",
      notes: "",
      activityAt: new Date().toISOString().slice(0, 16),
    },
  });

  const canSubmit =
    (contactId || memberId || dealId) && (contactId || dealId || memberId);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!canSubmit) {
      toast({
        title: "Link to contact, member, or deal required",
        variant: "destructive",
      });
      return;
    }
    try {
      await createMutation.mutateAsync({
        type: values.type,
        subject: values.subject?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        activityAt: values.activityAt,
        contactId,
        memberId,
        dealId,
      });
      form.reset({
        type: "CALL",
        subject: "",
        notes: "",
        activityAt: new Date().toISOString().slice(0, 16),
      });
      toast({ title: "Activity logged" });
      onSuccess?.();
    } catch {
      toast({ title: "Failed to log activity", variant: "destructive" });
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-lg">
      <div>
        <Label>Type</Label>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v: "CALL" | "MEETING") => field.onChange(v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">Call</SelectItem>
                <SelectItem value="MEETING">Meeting</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div>
        <Label htmlFor="log-activity-subject">Subject</Label>
        <Input
          id="log-activity-subject"
          {...form.register("subject")}
          placeholder="Subject (optional)"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="log-activity-datetime">Date & Time</Label>
        <Input
          id="log-activity-datetime"
          type="datetime-local"
          {...form.register("activityAt")}
          className="mt-1"
        />
        {form.formState.errors.activityAt && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.activityAt.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="log-activity-notes">Notes</Label>
        <Textarea
          id="log-activity-notes"
          {...form.register("notes")}
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
