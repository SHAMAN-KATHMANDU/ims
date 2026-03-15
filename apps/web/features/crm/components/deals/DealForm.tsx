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

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0),
  stage: z.string().optional(),
  probability: z.coerce
    .number()
    .min(0, "Probability must be at least 0")
    .max(100, "Probability must be between 0 and 100")
    .optional(),
  pipelineId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const editSchema = createSchema.extend({
  stage: z.string(),
  probability: z.coerce
    .number()
    .min(0, "Probability must be at least 0")
    .max(100, "Probability must be between 0 and 100"),
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
    stage: string;
    probability: number;
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
  const { data: pipelinesData } = usePipelines();
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
          stage: props.defaultValues.stage,
          probability: props.defaultValues.probability,
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
          probability: 0,
          pipelineId:
            (props.mode === "create" && "initialPipelineId" in props
              ? props.initialPipelineId
              : undefined) ??
            defaultPipeline?.id ??
            "",
        },
  });

  const stageNames = isEdit
    ? props.defaultValues.stageNames
    : (defaultPipeline?.stages?.map((s) => s.name) ?? []);

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
        probability: values.probability ?? 0,
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
        stage: values.stage,
        probability: values.probability,
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
        <div>
          <Label>Probability (%)</Label>
          <Input
            type="number"
            {...form.register("probability")}
            className="mt-1"
            min={0}
            max={100}
          />
          {form.formState.errors.probability && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.probability.message}
            </p>
          )}
        </div>
      </div>

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
        <Select
          value={form.watch("contactId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("contactId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.firstName} {c.lastName || ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Company</Label>
        <Select
          value={form.watch("companyId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("companyId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Assign To</Label>
        <Select
          value={form.watch("assignedToId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("assignedToId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
