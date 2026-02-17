"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useCreateDeal } from "@/hooks/useDeals";
import { usePipelines } from "@/hooks/usePipelines";
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
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0),
  stage: z.string().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  contactId: z.string().optional(),
  memberId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewDealPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const createMutation = useCreateDeal();
  const { data: pipelinesData } = usePipelines();
  const { data: companiesData } = useCompaniesForSelect();
  const { data: contactsData } = useContactsPaginated({ limit: 200 });
  const { data: membersData } = useMembersPaginated({ limit: 500 });
  const { data: users = [] } = useUsers({ limit: 500 });

  const pipelines = pipelinesData?.pipelines ?? [];
  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const companies = companiesData?.companies ?? [];
  const contacts = contactsData?.data ?? [];
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      value: 0,
      probability: 0,
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/deals`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">New Deal</h1>
      </div>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await createMutation.mutateAsync({
            name: values.name,
            value: values.value,
            stage: values.stage,
            probability: values.probability ?? 0,
            expectedCloseDate: values.expectedCloseDate,
            contactId: values.contactId,
            memberId: values.memberId,
            companyId: values.companyId,
            assignedToId: values.assignedToId,
            pipelineId: defaultPipeline?.id,
          });
          toast({ title: "Deal created" });
          router.push(`${basePath}/crm/deals`);
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
          <Label>Assign To</Label>
          <Select
            value={form.watch("assignedToId") || ""}
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
        <div>
          <Label>Expected Close Date</Label>
          <Input
            type="date"
            {...form.register("expectedCloseDate")}
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`${basePath}/crm/deals`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
