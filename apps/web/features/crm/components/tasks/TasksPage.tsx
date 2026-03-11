"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useTasksPaginated,
  useCompleteTask,
  useDeleteTask,
  useTask,
  useCreateTask,
  useUpdateTask,
  useBulkCompleteTasks,
  useBulkDeleteTasks,
} from "../../hooks/use-tasks";
import { useTaskSelectionStore } from "@/store/task-selection-store";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Check,
  Pencil,
  Trash2,
  Calendar,
  User as UserIcon,
  AlertCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskForm } from "./TaskForm";
import type {
  CreateTaskData,
  UpdateTaskData,
} from "../../services/task.service";

type TaskFilterTab = "all" | "incomplete" | "complete";
type DrawerMode = "new" | "edit" | null;

export function TasksPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isDesktop = useIsDesktop();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [taskTab, setTaskTab] = useState<TaskFilterTab>("all");
  const [dueToday, setDueToday] = useState(false);
  const [orphanedOnly, setOrphanedOnly] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const {
    selectedTaskIds,
    toggleTask,
    addTask,
    removeTask,
    clearSelection,
    isSelected,
  } = useTaskSelectionStore();

  const completedFilter =
    taskTab === "incomplete"
      ? false
      : taskTab === "complete"
        ? true
        : undefined;

  const { data, isLoading } = useTasksPaginated({
    page,
    limit: pageSize,
    search: debouncedSearch,
    completed: completedFilter,
    dueToday,
  });

  const { data: selectedTaskData } = useTask(selectedId ?? "");
  const completeMutation = useCompleteTask();
  const deleteMutation = useDeleteTask();
  const bulkCompleteMutation = useBulkCompleteTasks();
  const bulkDeleteMutation = useBulkDeleteTasks();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

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

  const openNew = () => {
    if (isDesktop) {
      setSelectedId(null);
      setDrawerMode("new");
    } else {
      router.push(`${basePath}/crm/tasks/new`);
    }
  };

  const openEdit = (id: string) => {
    if (isDesktop) {
      setSelectedId(id);
      setDrawerMode("edit");
    } else {
      router.push(`${basePath}/crm/tasks/${id}/edit`);
    }
  };

  const confirmDeleteTask = () => {
    if (!deleteTaskId) return;
    deleteMutation.mutate(deleteTaskId, {
      onSuccess: () => {
        toast({ title: "Task deleted" });
        if (selectedId === deleteTaskId) closeDrawer();
        setDeleteTaskId(null);
      },
      onError: () => setDeleteTaskId(null),
    });
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedId(null);
  };

  const handleCreateTask = async (data: CreateTaskData) => {
    await createMutation.mutateAsync(data);
    toast({ title: "Task created" });
    closeDrawer();
  };

  const handleUpdateTask = async (data: UpdateTaskData) => {
    if (!selectedId) return;
    await updateMutation.mutateAsync({ id: selectedId, data });
    toast({ title: "Task updated" });
    closeDrawer();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
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
          <Button
            variant={orphanedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setOrphanedOnly(!orphanedOnly);
              setPage(DEFAULT_PAGE);
            }}
            title="Tasks with no contact (orphaned)"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Orphaned
          </Button>
        </div>
      </div>

      {selectedTaskIds.size > 0 && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-md border bg-muted/50">
          <span className="text-sm">
            {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ids = [...selectedTaskIds];
              if (ids.length > 0) {
                bulkCompleteMutation.mutate(ids, {
                  onSuccess: () => {
                    toast({ title: "Tasks completed" });
                    clearSelection();
                  },
                  onError: () =>
                    toast({ title: "Failed to complete", variant: "destructive" }),
                });
              }
            }}
            disabled={bulkCompleteMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Complete
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              const ids = [...selectedTaskIds];
              bulkDeleteMutation.mutate(
                { ids },
                {
                  onSuccess: () => {
                    toast({ title: "Tasks deleted" });
                    clearSelection();
                  },
                  onError: () =>
                    toast({ title: "Delete failed", variant: "destructive" }),
                },
              );
            }}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      )}

      {/* ── Mobile card list ─────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div className="rounded-md border py-8 text-center text-muted-foreground">
            No tasks found
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Checkbox
                    checked={isSelected(task.id)}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <span
                    className={`text-sm font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {task.title}
                  </span>
                </div>
                <Badge
                  variant={task.completed ? "secondary" : "outline"}
                  className="text-xs shrink-0"
                >
                  {task.completed ? "Done" : "Todo"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.assignedTo && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {task.assignedTo.username}
                  </span>
                )}
                {!task.contact && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Orphaned
                  </span>
                )}
                {task.contact && (
                  <Link href={`${basePath}/crm/contacts/${task.contact.id}`}>
                    <span className="text-primary hover:underline">
                      {task.contact.firstName} {task.contact.lastName || ""}
                    </span>
                  </Link>
                )}
                {task.deal && (
                  <Link href={`${basePath}/crm/deals/${task.deal.id}`}>
                    <span className="text-primary hover:underline">
                      {task.deal.name}
                    </span>
                  </Link>
                )}
              </div>

              <div className="flex gap-1 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => openEdit(task.id)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                {!task.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => {
                      completeMutation.mutate(task.id, {
                        onSuccess: () => toast({ title: "Task completed" }),
                      });
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeleteTaskId(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    tasks.length > 0 &&
                    tasks.every((t) => isSelected(t.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      tasks.forEach((t) => addTask(t.id));
                    } else {
                      tasks.forEach((t) => removeTask(t.id));
                    }
                  }}
                />
              </TableHead>
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
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
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
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(task.id)}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>{task.assignedTo?.username ?? "—"}</TableCell>
                  <TableCell>
                    {!task.contact ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        Orphaned
                      </span>
                    ) : (
                      <Link
                        href={`${basePath}/crm/contacts/${task.contact.id}`}
                      >
                        <span className="text-primary hover:underline">
                          {task.contact.firstName} {task.contact.lastName || ""}
                        </span>
                      </Link>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(task.id)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
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
                        onClick={() => setDeleteTaskId(task.id)}
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

      <ResponsiveDrawer
        open={drawerMode !== null}
        onOpenChange={(o) => !o && closeDrawer()}
        title={drawerMode === "new" ? "New Task" : "Edit Task"}
      >
        {drawerMode === "new" && (
          <TaskForm
            mode="create"
            onSubmit={handleCreateTask}
            onCancel={closeDrawer}
            isLoading={createMutation.isPending}
          />
        )}
        {drawerMode === "edit" && selectedId && selectedTaskData?.task && (
          <TaskForm
            mode="edit"
            defaultValues={{
              title: selectedTaskData.task.title,
              dueDate: selectedTaskData.task.dueDate
                ? new Date(selectedTaskData.task.dueDate)
                    .toISOString()
                    .slice(0, 10)
                : "",
              contactId: selectedTaskData.task.contactId ?? undefined,
              dealId: selectedTaskData.task.dealId ?? undefined,
              assignedToId: selectedTaskData.task.assignedToId ?? undefined,
            }}
            onSubmit={handleUpdateTask}
            onCancel={closeDrawer}
            isLoading={updateMutation.isPending}
          />
        )}
      </ResponsiveDrawer>

      <AlertDialog
        open={!!deleteTaskId}
        onOpenChange={(o) => !o && setDeleteTaskId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
