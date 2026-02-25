import type { Metadata } from "next";
import { TasksPageClient } from "@/views/crm/tasks/TasksPage";
import { buildTaskListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Tasks | ${workspace}` };
}

export default async function CrmTasks({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildTaskListParamsFromSearch(resolvedSearchParams);

  return <TasksPageClient initialData={undefined} initialParams={listParams} />;
}
