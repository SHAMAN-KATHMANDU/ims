"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useTask, useUpdateTask, useCompleteTask } from "@/hooks/useTasks";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  memberId: z.string().optional(),
  dealId: z.string().optional(),
  assignedToId: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data, isLoading } = useTask(id);
  const updateMutation = useUpdateTask();
  const completeMutation = useCompleteTask();
  const { data: contactsData } = useContactsPaginated({ limit: 100 });
  const { data: dealsData } = useDealsPaginated({ limit: 100 });
  const { data: membersData } = useMembersPaginated({ limit: 500 });
  const { data: usersResult } = useUsers({ limit: 500 });
  const users = usersResult?.users ?? [];

  const task = data?.task;
  const contacts = contactsData?.data ?? [];
  const deals = dealsData?.data ?? [];
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: task
      ? {
          title: task.title,
          dueDate: task.dueDate
            ? new Date(task.dueDate).toISOString().slice(0, 10)
            : "",
          contactId: task.contactId ?? undefined,
          memberId: task.memberId ?? undefined,
          dealId: task.dealId ?? undefined,
          assignedToId: task.assignedToId ?? "",
        }
      : undefined,
  });

  if (isLoading || !task) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`${basePath}/crm/tasks`}>
            <Button variant="ghost">Back</Button>
          </Link>
          <h1 className="text-3xl font-bold">Edit Task</h1>
        </div>
        {!task.completed && (
          <Button
            onClick={() => {
              completeMutation.mutate(id, {
                onSuccess: () => {
                  toast({ title: "Task completed" });
                  router.push(`${basePath}/crm/tasks`);
                },
              });
            }}
            disabled={completeMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          const emptyToNull = (v: string | undefined) =>
            v == null || String(v).trim() === "" ? null : v;
          await updateMutation.mutateAsync({
            id,
            data: {
              title: values.title.trim(),
              dueDate: values.dueDate?.trim() || null,
              contactId: emptyToNull(values.contactId),
              memberId: emptyToNull(values.memberId),
              dealId: emptyToNull(values.dealId),
              assignedToId: values.assignedToId?.trim() || undefined,
            },
          });
          toast({ title: "Task updated" });
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
          <Label>Assign To *</Label>
          <Select
            value={form.watch("assignedToId")}
            onValueChange={(v) => form.setValue("assignedToId", v)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
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
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Link href={`${basePath}/crm/tasks`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
