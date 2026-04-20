"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationActionTypeValue } from "@repo/shared";

export function getDefaultActionConfig(
  actionType: AutomationActionTypeValue,
): Record<string, unknown> {
  switch (actionType) {
    case "workitem.create":
      return { title: "Follow up", type: "TASK", priority: "MEDIUM" };
    case "notification.send":
      return { title: "Automation notice", message: "Action completed" };
    case "transfer.create_draft":
      return { payloadPath: "suggestedTransfer" };
    case "record.update_field":
      return {
        entityType: "DEAL",
        entityIdTemplate: "{{event.entityId}}",
        field: "status",
        value: "OPEN",
      };
    case "crm.contact.update":
      return {
        contactIdTemplate: "{{event.payload.contactId}}",
        field: "status",
        value: "QUALIFIED",
      };
    case "crm.company.update":
      return {
        companyIdTemplate: "{{event.payload.companyId}}",
        field: "website",
        value: "https://example.com",
      };
    case "crm.deal.move_stage":
      return {
        dealIdTemplate: "{{event.entityId}}",
        targetStageId: "",
      };
    case "crm.activity.create":
      return { type: "CALL", subject: "Automation activity" };
    case "webhook.emit":
      return {
        url: "https://example.com/webhook",
        method: "POST",
        timeoutSeconds: 10,
      };
    default:
      return {};
  }
}

export function ActionConfigFields({
  actionType,
  value,
  onChange,
}: {
  actionType: AutomationActionTypeValue;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const update = (key: string, nextValue: unknown) =>
    onChange({ ...value, [key]: nextValue });

  if (actionType === "workitem.create") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Title"
          value={String(value.title ?? "")}
          onChange={(e) => update("title", e.target.value)}
        />
        <Select
          value={String(value.type ?? "TASK")}
          onValueChange={(next) => update("type", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Work item type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TASK">Task</SelectItem>
            <SelectItem value="APPROVAL">Approval</SelectItem>
            <SelectItem value="TRANSFER_REQUEST">Transfer request</SelectItem>
            <SelectItem value="RESTOCK_REQUEST">Restock request</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow up</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Description"
          value={String(value.description ?? "")}
          onChange={(e) => update("description", e.target.value)}
        />
        <Select
          value={String(value.priority ?? "MEDIUM")}
          onValueChange={(next) => update("priority", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (actionType === "notification.send") {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Notification title"
          value={String(value.title ?? "")}
          onChange={(e) => update("title", e.target.value)}
        />
        <Input
          placeholder="Notification message"
          value={String(value.message ?? "")}
          onChange={(e) => update("message", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "transfer.create_draft") {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Payload path"
          value={String(value.payloadPath ?? "suggestedTransfer")}
          onChange={(e) => update("payloadPath", e.target.value)}
        />
        <Input
          placeholder="Optional notes override"
          value={String(value.notes ?? "")}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "webhook.emit") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Webhook URL"
          value={String(value.url ?? "")}
          onChange={(e) => update("url", e.target.value)}
        />
        <Select
          value={String(value.method ?? "POST")}
          onValueChange={(next) => update("method", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Payload path"
          value={String(value.payloadPath ?? "")}
          onChange={(e) => update("payloadPath", e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={60}
          placeholder="Timeout seconds"
          value={String(value.timeoutSeconds ?? 10)}
          onChange={(e) =>
            update(
              "timeoutSeconds",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
        />
      </div>
    );
  }

  if (actionType === "crm.deal.move_stage") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Deal id template"
          value={String(value.dealIdTemplate ?? "{{event.entityId}}")}
          onChange={(e) => update("dealIdTemplate", e.target.value)}
        />
        <Input
          placeholder="Target stage id"
          value={String(value.targetStageId ?? "")}
          onChange={(e) => update("targetStageId", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "crm.activity.create") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          value={String(value.type ?? "CALL")}
          onValueChange={(next) => update("type", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Activity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="MEETING">Meeting</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Subject"
          value={String(value.subject ?? "")}
          onChange={(e) => update("subject", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "crm.contact.update") {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Contact id template"
          value={String(
            value.contactIdTemplate ?? "{{event.payload.contactId}}",
          )}
          onChange={(e) => update("contactIdTemplate", e.target.value)}
        />
        <Select
          value={String(value.field ?? "status")}
          onValueChange={(next) => update("field", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="source">Source</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="ownerId">Owner</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="New value"
          value={String(value.value ?? "")}
          onChange={(e) => update("value", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "crm.company.update") {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Company id template"
          value={String(
            value.companyIdTemplate ?? "{{event.payload.companyId}}",
          )}
          onChange={(e) => update("companyIdTemplate", e.target.value)}
        />
        <Select
          value={String(value.field ?? "website")}
          onValueChange={(next) => update("field", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="address">Address</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="New value"
          value={String(value.value ?? "")}
          onChange={(e) => update("value", e.target.value)}
        />
      </div>
    );
  }

  return (
    <Textarea
      rows={4}
      value={JSON.stringify(value, null, 2)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value) as Record<string, unknown>);
        } catch {
          onChange(value);
        }
      }}
    />
  );
}
