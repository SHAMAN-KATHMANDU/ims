"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useCreateTask } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/features/crm";
import type { CreateTaskData } from "@/features/crm";

export default function NewTaskPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams.get("dealId") ?? undefined;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateTask();

  const handleSubmit = async (data: CreateTaskData) => {
    await createMutation.mutateAsync(data);
    toast({ title: "Task created" });
    router.push(`${basePath}/crm/tasks`);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/crm/tasks`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">New Task</h1>
      </div>
      <TaskForm
        mode="create"
        defaultDealId={dealIdFromUrl}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`${basePath}/crm/tasks`)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
