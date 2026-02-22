"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useDeal, useUpdateDeal } from "@/hooks/useDeals";
import { useContactsPaginated } from "@/hooks/useContacts";
import { useCompaniesForSelect } from "@/hooks/useCompanies";
import { useMembersPaginated } from "@/hooks/useMember";
import { useUsers } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { dateInputToUtcMidnightIso } from "@/lib/datetime";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0),
  stage: z.string(),
  probability: z.coerce.number().min(0).max(100),
  expectedCloseDate: z.string().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]),
  contactId: z.string().optional(),
  memberId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data, isLoading } = useDeal(id);
  const updateMutation = useUpdateDeal();
  const { data: companiesData } = useCompaniesForSelect();
  const { data: contactsData } = useContactsPaginated({ limit: 200 });
  const { data: membersData } = useMembersPaginated({ limit: 500 });
  const { data: users = [] } = useUsers({ limit: 500 });

  const deal = data?.deal;
  const pipeline = deal?.pipeline as
    | { stages?: Array<{ name: string }> }
    | undefined;
  const stageNames = (pipeline?.stages ?? []).map((s) => s.name);
  const companies = companiesData?.companies ?? [];
  const contacts = contactsData?.data ?? [];
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: deal
      ? {
          name: deal.name,
          value: Number(deal.value),
          stage: deal.stage,
          probability: deal.probability,
          expectedCloseDate: deal.expectedCloseDate
            ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10)
            : "",
          status: deal.status,
          contactId: deal.contactId ?? undefined,
          memberId: deal.memberId ?? undefined,
          companyId: deal.companyId ?? undefined,
          assignedToId: deal.assignedToId,
        }
      : undefined,
  });

  if (isLoading || !deal) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/deals/${id}`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Deal</h1>
      </div>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await updateMutation.mutateAsync({
            id,
            data: {
              name: values.name,
              value: values.value,
              stage: values.stage,
              probability: values.probability,
              expectedCloseDate:
                dateInputToUtcMidnightIso(values.expectedCloseDate) ?? null,
              status: values.status,
              contactId: values.contactId || null,
              memberId: values.memberId || null,
              companyId: values.companyId || null,
              assignedToId: values.assignedToId,
            },
          });
          toast({ title: "Deal updated" });
          router.push(`${basePath}/crm/deals/${id}`);
        })}
        className="space-y-4"
      >
        <div>
          <Label>Name *</Label>
          <Input {...form.register("name")} className="mt-1" />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div>
          <Label>Value</Label>
          <Input type="number" {...form.register("value")} className="mt-1" />
        </div>
        <div>
          <Label>Stage</Label>
          <Select
            value={form.watch("stage")}
            onValueChange={(v) => form.setValue("stage", v)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stageNames.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(v) =>
              form.setValue("status", v as "OPEN" | "WON" | "LOST")
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
        </div>
        <div>
          <Label>Probability (%)</Label>
          <Input
            type="number"
            {...form.register("probability")}
            className="mt-1"
          />
        </div>
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
          <Label>Member</Label>
          <Select
            value={form.watch("memberId") || "__none__"}
            onValueChange={(v) =>
              form.setValue("memberId", v === "__none__" ? undefined : v)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name ? `${m.name} (${m.phone})` : m.phone}
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
          <Label>Assign To *</Label>
          <Select
            value={form.watch("assignedToId")}
            onValueChange={(v) => form.setValue("assignedToId", v)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {(users as Array<{ id: string; username: string }>).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Link href={`${basePath}/crm/deals/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
