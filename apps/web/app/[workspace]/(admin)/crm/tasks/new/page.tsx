"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useCreateTask } from "@/hooks/useTasks";
import { useContactsPaginated } from "@/hooks/useContacts";
import { useDealsPaginated } from "@/hooks/useDeals";
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
import { dateInputToUtcMidnightIso } from "@/lib/datetime";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  memberId: z.string().optional(),
  dealId: z.string().optional(),
  assignedToId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewTaskPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams.get("dealId") ?? undefined;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const createMutation = useCreateTask();
  const { data: contactsData } = useContactsPaginated({ limit: 100 });
  const { data: dealsData } = useDealsPaginated({ limit: 100 });
  const { data: membersData } = useMembersPaginated({ limit: 500 });
  const { data: users = [] } = useUsers({ limit: 500 });

  const contacts = contactsData?.data ?? [];
  const deals = dealsData?.data ?? [];
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", dealId: dealIdFromUrl },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/crm/tasks`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">New Task</h1>
      </div>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await createMutation.mutateAsync({
            title: values.title,
            dueDate: dateInputToUtcMidnightIso(values.dueDate),
            contactId: values.contactId || undefined,
            memberId: values.memberId || undefined,
            dealId: values.dealId || undefined,
            assignedToId: values.assignedToId,
          });
          toast({ title: "Task created" });
          router.push(`${basePath}/crm/tasks`);
        })}
        className="space-y-4"
      >
        <div>
          <Label>Title *</Label>
          <Input {...form.register("title")} className="mt-1" />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" {...form.register("dueDate")} className="mt-1" />
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
          <Label>Deal</Label>
          <Select
            value={form.watch("dealId") || "__none__"}
            onValueChange={(v) =>
              form.setValue("dealId", v === "__none__" ? undefined : v)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select deal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {deals.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`${basePath}/crm/tasks`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
