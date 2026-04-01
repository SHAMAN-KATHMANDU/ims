"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePipelines } from "../../hooks/use-pipelines";
import { useContactsPaginated } from "../../hooks/use-contacts";
import { useCompaniesForSelect } from "../../hooks/use-companies";
import { useUsers } from "@/features/users";
import type {
  CreateDealData,
  UpdateDealData,
  Deal,
} from "../../services/deal.service";
import {
  checkDiscountAuthority,
  type DiscountAuthorityResult,
} from "../../services/discount-authority.service";
import { DealLineItemsSection } from "./DealLineItemsSection";
import { useEnvFeatureFlag, useFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0),
  stage: z.string().optional(),
  pipelineId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const editSchema = createSchema.extend({
  pipelineId: z.string().uuid("Select a pipeline"),
  stage: z.string(),
  status: z.enum(["OPEN", "WON", "LOST"]),
  editReason: z.string().max(500).optional().nullable(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface DealFormCreateProps {
  mode: "create";
  initialPipelineId?: string;
  onSubmit: (data: CreateDealData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface DealFormEditProps {
  mode: "edit";
  defaultValues: {
    name: string;
    value: number;
    pipelineId: string;
    stage: string;
    expectedCloseDate?: string;
    status: "OPEN" | "WON" | "LOST";
    contactId?: string;
    companyId?: string;
    assignedToId: string;
    stageNames: string[];
    editReason?: string | null;
  };
  /** Full deal for line items section (products, convert to sale) */
  deal?: Deal;
  basePath?: string;
  onSubmit: (data: UpdateDealData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type DealFormProps = DealFormCreateProps | DealFormEditProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function DealForm(props: DealFormProps) {
  const envDealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  const salesPipelinePlan = useFeatureFlag(Feature.SALES_PIPELINE);
  const dealsEnabled = envDealsEnabled && salesPipelinePlan;
  const { data: pipelinesData } = usePipelines(undefined, {
    enabled: dealsEnabled,
  });
  const { data: contactsData } = useContactsPaginated({ limit: 10 });
  const { data: companiesData } = useCompaniesForSelect();
  const { data: usersResult } = useUsers({ limit: 10 });

  const pipelines = useMemo(
    () => pipelinesData?.pipelines ?? [],
    [pipelinesData?.pipelines],
  );
  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const contacts = contactsData?.data ?? [];
  const companies = companiesData?.companies ?? [];
  const users = usersResult?.users ?? [];

  const isEdit = props.mode === "edit";

  const form = useForm<EditFormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    mode: "onBlur",
    defaultValues: isEdit
      ? {
          name: props.defaultValues.name,
          value: props.defaultValues.value,
          pipelineId: props.defaultValues.pipelineId,
          stage: props.defaultValues.stage,
          expectedCloseDate: props.defaultValues.expectedCloseDate ?? "",
          status: props.defaultValues.status,
          contactId: props.defaultValues.contactId ?? "",
          companyId: props.defaultValues.companyId ?? "",
          assignedToId: props.defaultValues.assignedToId,
          editReason: props.defaultValues.editReason ?? "",
        }
      : {
          name: "",
          value: 0,
          pipelineId:
            (props.mode === "create" && "initialPipelineId" in props
              ? props.initialPipelineId
              : undefined) ??
            defaultPipeline?.id ??
            "",
        },
  });

  const watchedPipelineId = form.watch("pipelineId");

  const stageNames = useMemo(() => {
    if (props.mode === "edit") {
      const p = pipelines.find((x) => x.id === watchedPipelineId);
      return p?.stages?.map((s) => s.name) ?? props.defaultValues.stageNames;
    }
    const pid = watchedPipelineId || defaultPipeline?.id;
    const p = pipelines.find((x) => x.id === pid);
    return p?.stages?.map((s) => s.name) ?? [];
  }, [props, pipelines, watchedPipelineId, defaultPipeline?.id]);

  const initialPipelineId =
    props.mode === "create" && "initialPipelineId" in props
      ? props.initialPipelineId
      : undefined;

  useEffect(() => {
    if (isEdit || pipelines.length === 0) return;
    const current = form.getValues("pipelineId");
    if (current && pipelines.some((p) => p.id === current)) return;
    const fallback =
      initialPipelineId ?? defaultPipeline?.id ?? pipelines[0]?.id ?? "";
    if (fallback) form.setValue("pipelineId", fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable; omit to avoid overwriting user selection on identity change
  }, [isEdit, pipelines, defaultPipeline?.id, initialPipelineId]);

  useEffect(() => {
    if (!watchedPipelineId || stageNames.length === 0) return;
    const cur = form.getValues("stage");
    if (!cur || !stageNames.includes(cur)) {
      form.setValue("stage", stageNames[0]!);
    }
  }, [watchedPipelineId, stageNames, form]);

  // ── Discount authority check ──────────────────────────────────────────────
  const pipelineType =
    isEdit && "deal" in props ? props.deal?.pipeline?.type : undefined;
  const purchaseCount =
    isEdit && "deal" in props ? (props.deal?.contact?.purchaseCount ?? 0) : 0;
  const showDiscountCheck =
    isEdit && pipelineType && pipelineType !== "GENERAL";

  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [discountResult, setDiscountResult] =
    useState<DiscountAuthorityResult | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);

  const handleDiscountCheck = useCallback(async () => {
    const pct = parseFloat(discountPercent);
    if (!pipelineType || isNaN(pct) || pct <= 0) {
      setDiscountResult(null);
      return;
    }
    setDiscountLoading(true);
    try {
      const result = await checkDiscountAuthority({
        pipelineType,
        purchaseCount,
        discountPercent: pct,
      });
      setDiscountResult(result);
    } catch {
      setDiscountResult(null);
    } finally {
      setDiscountLoading(false);
    }
  }, [discountPercent, pipelineType, purchaseCount]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (props.mode === "create") {
      await props.onSubmit({
        name: values.name,
        value: values.value,
        stage: values.stage,
        expectedCloseDate: values.expectedCloseDate || undefined,
        contactId: values.contactId || undefined,
        companyId: values.companyId || undefined,
        assignedToId: values.assignedToId || undefined,
        pipelineId:
          values.pipelineId?.trim() || defaultPipeline?.id || undefined,
      });
    } else {
      await props.onSubmit({
        name: values.name,
        value: values.value,
        pipelineId: values.pipelineId,
        stage: values.stage,
        expectedCloseDate: values.expectedCloseDate || null,
        status: values.status,
        contactId: values.contactId || null,
        companyId: values.companyId || null,
        assignedToId: values.assignedToId,
        editReason: values.editReason?.trim() || null,
      });
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <Label>Name *</Label>
        <Input {...form.register("name")} className="mt-1" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Value</Label>
          <Input
            type="number"
            {...form.register("value")}
            className="mt-1"
            min={0}
          />
          {form.formState.errors.value && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.value.message}
            </p>
          )}
        </div>
      </div>

      {isEdit && pipelines.length > 0 && (
        <div>
          <Label>Pipeline</Label>
          <Controller
            name="pipelineId"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.pipelineId && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.pipelineId.message}
            </p>
          )}
        </div>
      )}

      {isEdit && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Stage</Label>
            <Controller
              name="stage"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.stage && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.stage.message}
              </p>
            )}
          </div>
          <div>
            <Label>Status</Label>
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "OPEN"}
                  onValueChange={(v) =>
                    field.onChange(v as "OPEN" | "WON" | "LOST")
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.status && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>
        </div>
      )}

      {!isEdit && pipelines.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Pipeline</Label>
            <Controller
              name="pipelineId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.isDefault ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Stage</Label>
            <Controller
              name="stage"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageNames.map((stageName) => (
                      <SelectItem key={stageName} value={stageName}>
                        {stageName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      )}

      {isEdit && (
        <div>
          <Label>Edit reason (optional)</Label>
          <Input
            {...form.register("editReason")}
            placeholder="Why is this deal being updated?"
            className="mt-1"
          />
          {form.formState.errors.editReason && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.editReason.message}
            </p>
          )}
        </div>
      )}

      {showDiscountCheck && (
        <div className="rounded-lg border p-3 space-y-2">
          <Label>Discount Authority Check</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Discount %"
              value={discountPercent}
              onChange={(e) => {
                setDiscountPercent(e.target.value);
                setDiscountResult(null);
              }}
              className="w-32"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={discountLoading || !discountPercent}
              onClick={handleDiscountCheck}
            >
              {discountLoading ? "Checking..." : "Check"}
            </Button>
          </div>
          {discountResult && (
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant={
                  discountResult.authority === "AUTO_APPROVED"
                    ? "default"
                    : discountResult.authority === "HUMAN_REVIEW"
                      ? "secondary"
                      : "destructive"
                }
              >
                {discountResult.authority.replace("_", " ")}
              </Badge>
              <span className="text-muted-foreground">
                {discountResult.reason}
              </span>
            </div>
          )}
        </div>
      )}

      <div>
        <Label>Expected Close Date</Label>
        <Input
          type="date"
          {...form.register("expectedCloseDate")}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Contact</Label>
        <div className="mt-1">
          <SearchableSelect
            options={contacts.map((c) => ({
              value: c.id,
              label: `${c.firstName} ${c.lastName || ""}`.trim(),
            }))}
            value={form.watch("contactId") || ""}
            onChange={(value) => form.setValue("contactId", value || undefined)}
            includeAll
            allLabel="None"
            placeholder="Search contacts..."
          />
        </div>
      </div>

      <div>
        <Label>Company</Label>
        <div className="mt-1">
          <SearchableSelect
            options={companies.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={form.watch("companyId") || ""}
            onChange={(value) => form.setValue("companyId", value || undefined)}
            includeAll
            allLabel="None"
            placeholder="Search companies..."
          />
        </div>
      </div>

      <div>
        <Label>Assign To</Label>
        <div className="mt-1">
          <SearchableSelect
            options={users.map((u) => ({
              value: u.id,
              label: u.username,
            }))}
            value={form.watch("assignedToId") || ""}
            onChange={(value) =>
              form.setValue("assignedToId", value || undefined)
            }
            includeAll
            allLabel="Unassigned"
            placeholder="Search users..."
          />
        </div>
      </div>

      {isEdit &&
        "deal" in props &&
        props.deal &&
        "basePath" in props &&
        props.basePath && (
          <div className="border-t pt-4">
            <DealLineItemsSection deal={props.deal} basePath={props.basePath} />
          </div>
        )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={props.isLoading}>
          {props.isLoading
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Deal"}
        </Button>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
