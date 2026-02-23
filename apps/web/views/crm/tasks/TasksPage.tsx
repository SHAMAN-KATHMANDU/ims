"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useTasksPaginated,
  useCompleteTask,
  useDeleteTask,
  type TaskListParams,
  type PaginatedTasksResponse,
} from "@/hooks/useTasks";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Check, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";

type TaskFilterTab = "all" | "incomplete" | "complete";

export interface TasksPageClientProps {
  initialData?: PaginatedTasksResponse;
  initialParams?: TaskListParams;
}

export function TasksPageClient({
  initialData,
  initialParams,
}: TasksPageClientProps = {}) {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const [page, setPage] = useState(initialParams?.page ?? DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(
    initialParams?.limit ?? DEFAULT_LIMIT,
  );
  const [search, setSearch] = useState(initialParams?.search ?? "");
  const [taskTab, setTaskTab] = useState<TaskFilterTab>(
    initialParams?.completed === false
      ? "incomplete"
      : initialParams?.completed === true
        ? "complete"
        : "all",
  );
  const [dueToday, setDueToday] = useState(initialParams?.dueToday ?? false);

  const completedFilter =
    taskTab === "incomplete"
      ? false
      : taskTab === "complete"
        ? true
        : undefined;

  const { data, isLoading } = useTasksPaginated(
    {
      page,
      limit: pageSize,
      search,
      completed: completedFilter,
      dueToday,
    },
    { initialData },
  );

  const completeMutation = useCompleteTask();
  const deleteMutation = useDeleteTask();

  const tasks = data?.data ?? [];
  const pagination = data?.pagination
    ? ({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        itemsPerPage: data.pagination.itemsPerPage,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      } as PaginationState)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Link href={`${basePath}/crm/tasks/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(DEFAULT_PAGE);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Tabs
            value={taskTab}
            onValueChange={(v) => {
              setTaskTab(v as TaskFilterTab);
              setPage(DEFAULT_PAGE);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
              <TabsTrigger value="complete">Complete</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={dueToday ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDueToday(!dueToday);
              setPage(DEFAULT_PAGE);
            }}
          >
            Due Today
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>{task.assignedTo?.username ?? "—"}</TableCell>
                  <TableCell>
                    {task.contact ? (
                      <Link
                        href={`${basePath}/crm/contacts/${task.contact.id}`}
                      >
                        <span className="text-primary hover:underline">
                          {task.contact.firstName} {task.contact.lastName || ""}
                        </span>
                      </Link>
                    ) : task.member ? (
                      <span>{task.member.name || task.member.phone}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {task.deal ? (
                      <Link href={`${basePath}/crm/deals/${task.deal.id}`}>
                        <span className="text-primary hover:underline">
                          {task.deal.name}
                        </span>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {task.completed ? (
                      <span className="text-muted-foreground">Done</span>
                    ) : (
                      "Todo"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`${basePath}/crm/tasks/${task.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      {!task.completed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            completeMutation.mutate(task.id, {
                              onSuccess: () =>
                                toast({ title: "Task completed" }),
                            });
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Delete this task?")) {
                            deleteMutation.mutate(task.id, {
                              onSuccess: () => toast({ title: "Task deleted" }),
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(DEFAULT_PAGE);
          }}
        />
      )}
    </div>
  );
}

export function TasksPage(props: TasksPageClientProps) {
  return <TasksPageClient {...props} />;
}
