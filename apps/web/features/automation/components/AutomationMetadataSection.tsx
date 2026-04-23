"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HelpTopicSheet } from "@/components/help-topic-sheet";
import { Package } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePipelines } from "@/features/crm";
import { useActiveLocations } from "@/features/locations";
import {
  AUTOMATION_EXECUTION_MODE_LABELS,
  AUTOMATION_EXECUTION_MODE_VALUES,
  AUTOMATION_SCOPE_VALUES,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUS_VALUES,
} from "@repo/shared";
import type { AutomationDefinitionFormValues } from "../validation";

const SCOPE_LABELS = {
  GLOBAL: "Global",
  CRM_PIPELINE: "CRM pipeline",
  LOCATION: "Location",
  PRODUCT_VARIATION: "Product variation",
} as const;

function getScopeIdPlaceholder(
  scopeType: AutomationDefinitionFormValues["scopeType"],
): string {
  switch (scopeType) {
    case "CRM_PIPELINE":
      return "Select a CRM pipeline";
    case "LOCATION":
      return "Select a location";
    case "PRODUCT_VARIATION":
      return "Enter a product variation UUID";
    default:
      return "No scope id required";
  }
}

interface AutomationMetadataSectionProps {
  hasInventoryTrigger: boolean;
}

export function AutomationMetadataSection({
  hasInventoryTrigger,
}: AutomationMetadataSectionProps) {
  const form = useFormContext<AutomationDefinitionFormValues>();
  const {
    formState: { errors },
  } = form;
  const scopeType = form.watch("scopeType");

  const { data: pipelineData } = usePipelines(
    { page: 1, limit: 100 },
    { enabled: scopeType === "CRM_PIPELINE" },
  );
  const { data: locationData } = useActiveLocations();

  useEffect(() => {
    if (scopeType === "GLOBAL" && form.getValues("scopeId")) {
      form.setValue("scopeId", "", { shouldValidate: true });
    }
  }, [form, scopeType]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="automation-scope-type">Scope</Label>
          <HelpTopicSheet topicLabel="Scope" sheetTitle="Automation scope">
            <p>
              Global runs tenant-wide. CRM pipeline, location, or product
              variation limits events to that target—choose the matching scope
              target below when required.
            </p>
          </HelpTopicSheet>
        </div>
        <Select
          value={scopeType}
          onValueChange={(next) =>
            form.setValue(
              "scopeType",
              next as AutomationDefinitionFormValues["scopeType"],
            )
          }
        >
          <SelectTrigger id="automation-scope-type">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            {AUTOMATION_SCOPE_VALUES.map((scope) => (
              <SelectItem key={scope} value={scope}>
                {SCOPE_LABELS[scope]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="automation-scope-target">Scope target</Label>
          <HelpTopicSheet topicLabel="Scope target" sheetTitle="Scope target">
            <p>
              Required for CRM pipeline, location, or product variation scopes.
              Global scope ignores this field.
            </p>
            {hasInventoryTrigger ? (
              <p>
                <strong>Inventory events</strong> (stock adjustments, low stock,
                thresholds) are emitted per <strong>warehouse</strong>—set scope
                to <strong>Location</strong> and pick one site below for a
                focused setup, or stay on <strong>Global</strong> to react when
                any location reports low stock.
              </p>
            ) : null}
          </HelpTopicSheet>
        </div>
        {scopeType === "CRM_PIPELINE" ? (
          <Select
            value={form.watch("scopeId") || ""}
            onValueChange={(next) => form.setValue("scopeId", next)}
          >
            <SelectTrigger id="automation-scope-target">
              <SelectValue placeholder={getScopeIdPlaceholder(scopeType)} />
            </SelectTrigger>
            <SelectContent>
              {(pipelineData?.pipelines ?? []).map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {scopeType === "LOCATION" ? (
          <Select
            value={form.watch("scopeId") || ""}
            onValueChange={(next) => form.setValue("scopeId", next)}
          >
            <SelectTrigger id="automation-scope-target">
              <SelectValue placeholder={getScopeIdPlaceholder(scopeType)} />
            </SelectTrigger>
            <SelectContent>
              {(locationData ?? []).map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {scopeType === "PRODUCT_VARIATION" ? (
          <Input
            id="automation-scope-target"
            placeholder={getScopeIdPlaceholder(scopeType)}
            aria-invalid={!!errors.scopeId}
            aria-describedby={
              errors.scopeId ? "automation-scope-target-error" : undefined
            }
            {...form.register("scopeId")}
          />
        ) : null}
        {scopeType === "GLOBAL" ? (
          <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            This automation applies across the tenant.
          </div>
        ) : null}
        {errors.scopeId?.message ? (
          <p
            id="automation-scope-target-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.scopeId.message}
          </p>
        ) : null}
      </div>
      {hasInventoryTrigger ? (
        <Alert className="border-primary/20 bg-primary/5 md:col-span-2">
          <Package className="text-primary" aria-hidden />
          <AlertTitle>Inventory events</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm">
                Low-stock and threshold signals are emitted per warehouse. Use{" "}
                <strong>Location</strong> scope for one site or{" "}
                <strong>Global</strong> for all sites.
              </p>
              <HelpTopicSheet
                topicLabel="Inventory scope setup"
                sheetTitle="Low stock and inventory scope"
              >
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Choose <strong>Location</strong> under Scope, then select a
                    warehouse in <strong>Scope target</strong>—this automation
                    runs only when that site reports low stock or threshold
                    events.
                  </li>
                  <li>
                    Or keep <strong>Global</strong> to use the same steps for{" "}
                    <strong>every</strong> warehouse (still one automation
                    definition).
                  </li>
                  <li>
                    After saving, use <strong>SHADOW</strong> mode and trigger a
                    low-stock scenario in test data; check{" "}
                    <strong>Recent runs</strong> on the Event automations page.
                  </li>
                </ol>
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      form.setValue("scopeType", "LOCATION", {
                        shouldValidate: true,
                      });
                    }}
                  >
                    Set scope to Location
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue("scopeType", "GLOBAL", {
                        shouldValidate: true,
                      });
                      form.setValue("scopeId", "", {
                        shouldValidate: true,
                      });
                    }}
                  >
                    Use Global (all warehouses)
                  </Button>
                </div>
              </HelpTopicSheet>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="automation-status">Status</Label>
        <Select
          value={form.watch("status")}
          onValueChange={(next) =>
            form.setValue(
              "status",
              next as AutomationDefinitionFormValues["status"],
            )
          }
        >
          <SelectTrigger id="automation-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {AUTOMATION_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {AUTOMATION_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="automation-execution-mode">Execution mode</Label>
          <HelpTopicSheet
            topicLabel="Execution mode"
            sheetTitle="Execution mode"
          >
            <p>
              <strong>{AUTOMATION_EXECUTION_MODE_LABELS.LIVE}</strong> performs
              real actions.{" "}
              <strong>{AUTOMATION_EXECUTION_MODE_LABELS.SHADOW}</strong>{" "}
              simulates steps and records previews in run history without
              changing data—use while testing, then switch to{" "}
              {AUTOMATION_EXECUTION_MODE_LABELS.LIVE}.
            </p>
          </HelpTopicSheet>
        </div>
        <Select
          value={form.watch("executionMode")}
          onValueChange={(next) =>
            form.setValue(
              "executionMode",
              next as AutomationDefinitionFormValues["executionMode"],
            )
          }
        >
          <SelectTrigger id="automation-execution-mode">
            <SelectValue placeholder="Select execution mode" />
          </SelectTrigger>
          <SelectContent>
            {AUTOMATION_EXECUTION_MODE_VALUES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {AUTOMATION_EXECUTION_MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 rounded-md border p-3 md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-1">
            <Label className="leading-normal">
              Suppress legacy CRM workflows
            </Label>
            <HelpTopicSheet
              topicLabel="Suppress legacy CRM workflows"
              sheetTitle="Suppress legacy CRM workflows"
            >
              <p>
                When enabled, matching rules from{" "}
                <strong>Settings → Deal pipeline rules</strong> are skipped for
                the same deal events so you do not double-create tasks or
                notifications while both systems are in use.
              </p>
            </HelpTopicSheet>
          </div>
          <Switch
            checked={form.watch("suppressLegacyWorkflows")}
            onCheckedChange={(checked) =>
              form.setValue("suppressLegacyWorkflows", checked)
            }
          />
        </div>
      </div>
    </div>
  );
}
