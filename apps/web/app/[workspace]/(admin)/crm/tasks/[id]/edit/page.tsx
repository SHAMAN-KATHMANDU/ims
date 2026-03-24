"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useTask, useUpdateTask, useCompleteTask } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import { TaskForm } from "@/features/crm";
import type { UpdateTaskData } from "@/features/crm";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";

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
  const task = data?.task;

  const handleSubmit = async (data: UpdateTaskData) => {
    await updateMutation.mutateAsync({ id, data });
    toast({ title: "Task updated" });
    router.push(`${basePath}/crm/tasks`);
  };

  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        {isLoading || !task ? (
          <Skeleton className="h-96 w-full max-w-2xl" />
        ) : (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
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
            <TaskForm
              mode="edit"
              defaultValues={{
                title: task.title,
                dueDate: task.dueDate
                  ? new Date(task.dueDate).toISOString().slice(0, 10)
                  : "",
                contactId: task.contactId ?? undefined,
                dealId: task.dealId ?? undefined,
                assignedToId: task.assignedToId ?? undefined,
              }}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`${basePath}/crm/tasks`)}
              isLoading={updateMutation.isPending}
            />
          </div>
        )}
      </AuthGuard>
    </FeaturePageGuard>
  );
}
