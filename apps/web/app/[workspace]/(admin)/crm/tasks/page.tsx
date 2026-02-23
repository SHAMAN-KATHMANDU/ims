import { headers } from "next/headers";
import type { Metadata } from "next";
import { TasksPageClient } from "@/views/crm/tasks/TasksPage";
import { getTasksServer } from "@/services/taskServiceServer";
import { buildTaskListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Tasks | ${workspace}` };
}

/** CRM Tasks. Server-fetches initial data. */
export default async function CrmTasks({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildTaskListParamsFromSearch(resolvedSearchParams);

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getTasksServer(cookie, workspace, listParams);

  return (
    <TasksPageClient initialData={initialData} initialParams={listParams} />
  );
}
