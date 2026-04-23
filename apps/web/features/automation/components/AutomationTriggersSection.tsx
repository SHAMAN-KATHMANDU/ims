"use client";

import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpTopicSheet } from "@/components/help-topic-sheet";
import { Trash2 } from "lucide-react";
import {
  AUTOMATION_CONDITION_OPERATOR_META,
  AUTOMATION_CONDITION_OPERATORS,
  AUTOMATION_EVENT_GROUP_ORDER,
  AUTOMATION_TRIGGER_EVENT_CATALOG,
  getAutomationTriggerEventsByGroup,
  type AutomationCondition,
} from "@repo/shared";
import type { AutomationDefinitionFormValues } from "../validation";

const AUTOMATION_EVENT_GROUP_LABELS: Record<
  (typeof AUTOMATION_EVENT_GROUP_ORDER)[number],
  string
> = {
  CRM: "CRM",
  SALES: "Sales",
  INVENTORY: "Inventory",
  TRANSFERS: "Transfers",
  CATALOG: "Catalog",
  MEMBERS: "Members",
  WORK_ITEMS: "Work items",
  VENDORS: "Vendors",
  LOCATIONS: "Locations",
  STOREFRONT: "Storefront",
};

function getDefaultCondition(): AutomationCondition {
  return { path: "total", operator: "gte", value: 1000 };
}

function formatConditionValueForDisplay(
  operator: AutomationCondition["operator"],
  value: unknown,
): string {
  if (value == null) return "";
  if (operator === "in" && Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }
  return String(value);
}

const NUMERIC_OPERATORS = new Set<AutomationCondition["operator"]>([
  "gt",
  "gte",
  "lt",
  "lte",
]);

export function AutomationTriggersSection() {
  const form = useFormContext<AutomationDefinitionFormValues>();
  const {
    formState: { errors },
  } = form;

  const triggerArray = useFieldArray({
    control: form.control,
    name: "triggers",
  });

  const triggerEventsByGroup = useMemo(
    () => getAutomationTriggerEventsByGroup(),
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Label>Triggers</Label>
          <HelpTopicSheet
            topicLabel="Triggers and conditions"
            sheetTitle="Triggers and conditions"
          >
            <p>
              Optional conditions use a path into the event payload (for example{" "}
              <code className="rounded bg-muted px-1">total</code> or{" "}
              <code className="rounded bg-muted px-1">payload.amount</code>), an
              operator, and a value. Use <strong>Exists</strong> to require a
              field without comparing its value.
            </p>
          </HelpTopicSheet>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            triggerArray.append({
              eventName: "sales.sale.created",
              conditions: [],
              delayMinutes: 0,
            })
          }
        >
          Add trigger
        </Button>
      </div>
      {triggerArray.fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-md border p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
            <Select
              value={form.watch(`triggers.${index}.eventName`)}
              onValueChange={(next) =>
                form.setValue(
                  `triggers.${index}.eventName`,
                  next as AutomationDefinitionFormValues["triggers"][number]["eventName"],
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(24rem,var(--radix-select-content-available-height))]">
                {AUTOMATION_EVENT_GROUP_ORDER.map((group) => {
                  const events = triggerEventsByGroup[group];
                  if (!events?.length) return null;
                  return (
                    <SelectGroup key={group}>
                      <SelectLabel>
                        {AUTOMATION_EVENT_GROUP_LABELS[group]}
                      </SelectLabel>
                      {events.map((eventName) => {
                        const meta =
                          AUTOMATION_TRIGGER_EVENT_CATALOG[eventName];
                        const label = meta?.label ?? eventName;
                        const description =
                          meta?.description ?? "No description available.";
                        return (
                          <SelectItem
                            key={eventName}
                            value={eventName}
                            textValue={`${label} ${eventName}`}
                          >
                            <span className="flex flex-col items-start gap-0.5 py-0.5 text-left">
                              <span>{label}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {description}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              {...form.register(`triggers.${index}.delayMinutes`, {
                valueAsNumber: true,
              })}
              placeholder="Delay min"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove trigger ${index + 1}`}
              onClick={() => triggerArray.remove(index)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Conditions
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const current =
                    form.getValues(`triggers.${index}.conditions`) ?? [];
                  form.setValue(`triggers.${index}.conditions`, [
                    ...current,
                    getDefaultCondition(),
                  ]);
                }}
              >
                Add condition
              </Button>
            </div>
            {(form.watch(`triggers.${index}.conditions`) ?? []).map(
              (condition, conditionIndex) => {
                const conditionFieldErrors =
                  errors.triggers?.[index]?.conditions?.[conditionIndex];
                return (
                  <div
                    key={`${field.id}-condition-${conditionIndex}`}
                    className="space-y-1"
                  >
                    <div className="grid gap-2 md:grid-cols-[1.2fr_160px_1fr_auto]">
                      <Input
                        placeholder="Payload path"
                        aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} path`}
                        value={String(condition.path ?? "")}
                        onChange={(e) =>
                          form.setValue(
                            `triggers.${index}.conditions.${conditionIndex}.path`,
                            e.target.value,
                            { shouldValidate: true },
                          )
                        }
                      />
                      <Select
                        value={condition.operator}
                        onValueChange={(next) => {
                          const op = next as AutomationCondition["operator"];
                          form.setValue(
                            `triggers.${index}.conditions.${conditionIndex}.operator`,
                            op,
                            { shouldValidate: false },
                          );
                          if (op === "exists") {
                            form.setValue(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                              undefined,
                              { shouldValidate: true },
                            );
                          } else if (op === "in") {
                            const v = form.getValues(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                            );
                            if (Array.isArray(v)) {
                              form.setValue(
                                `triggers.${index}.conditions.${conditionIndex}.value`,
                                v.map(String).join(", "),
                                { shouldValidate: true },
                              );
                            } else if (typeof v !== "string") {
                              form.setValue(
                                `triggers.${index}.conditions.${conditionIndex}.value`,
                                "",
                                { shouldValidate: true },
                              );
                            }
                          } else if (NUMERIC_OPERATORS.has(op)) {
                            const v = form.getValues(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                            );
                            const n = Number(v);
                            form.setValue(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                              Number.isFinite(n) ? n : 0,
                              { shouldValidate: true },
                            );
                          }
                        }}
                      >
                        <SelectTrigger
                          aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} operator`}
                        >
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTOMATION_CONDITION_OPERATORS.map((operator) => {
                            const opMeta =
                              AUTOMATION_CONDITION_OPERATOR_META[operator];
                            return (
                              <SelectItem
                                key={operator}
                                value={operator}
                                textValue={opMeta.label}
                              >
                                <span className="flex flex-col items-start gap-0.5 py-0.5 text-left">
                                  <span>{opMeta.label}</span>
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {opMeta.description}
                                  </span>
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {condition.operator === "exists" ? (
                        <span className="self-center px-1 text-sm text-muted-foreground">
                          No value
                        </span>
                      ) : null}
                      {condition.operator === "in" ? (
                        <Textarea
                          rows={2}
                          placeholder='e.g. ["A","B"] or A, B'
                          aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} value`}
                          value={formatConditionValueForDisplay(
                            condition.operator,
                            condition.value,
                          )}
                          onChange={(e) =>
                            form.setValue(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                              e.target.value,
                              { shouldValidate: true },
                            )
                          }
                        />
                      ) : null}
                      {NUMERIC_OPERATORS.has(condition.operator) ? (
                        <Input
                          type="number"
                          aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} numeric value`}
                          value={
                            condition.value === "" ||
                            condition.value === undefined ||
                            condition.value === null
                              ? ""
                              : String(condition.value)
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            form.setValue(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                              raw === "" ? "" : Number(raw),
                              { shouldValidate: true },
                            );
                          }}
                        />
                      ) : null}
                      {condition.operator !== "exists" &&
                      condition.operator !== "in" &&
                      !NUMERIC_OPERATORS.has(condition.operator) ? (
                        <Input
                          placeholder="Value"
                          aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} value`}
                          value={
                            condition.value == null
                              ? ""
                              : String(condition.value)
                          }
                          onChange={(e) =>
                            form.setValue(
                              `triggers.${index}.conditions.${conditionIndex}.value`,
                              e.target.value,
                              { shouldValidate: true },
                            )
                          }
                        />
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove condition ${conditionIndex + 1} on trigger ${index + 1}`}
                        onClick={() => {
                          const current =
                            form.getValues(`triggers.${index}.conditions`) ??
                            [];
                          form.setValue(
                            `triggers.${index}.conditions`,
                            current.filter((_, i) => i !== conditionIndex),
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    {conditionFieldErrors?.path?.message ? (
                      <p role="alert" className="text-xs text-destructive">
                        {conditionFieldErrors.path.message}
                      </p>
                    ) : null}
                    {conditionFieldErrors?.value?.message ? (
                      <p role="alert" className="text-xs text-destructive">
                        {String(conditionFieldErrors.value.message)}
                      </p>
                    ) : null}
                  </div>
                );
              },
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
