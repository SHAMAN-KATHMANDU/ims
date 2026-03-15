"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { ContactDetail as ContactDetailType } from "../../services/contact.service";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddContactNote,
  useDeleteContactNote,
  useAddContactAttachment,
  useDeleteContactAttachment,
  useContactTags,
  useUpdateContact,
} from "../../hooks/use-contacts";
import { useActivitiesByContact } from "../../hooks/use-activities";
import { useCreateTask } from "../../hooks/use-tasks";
import { useCreateDeal } from "../../hooks/use-deals";
import { usePipelines } from "../../hooks/use-pipelines";
import { useUsers, type User } from "@/features/users";
import { LogActivityDialog } from "../components/LogActivityDialog";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Trash2,
  Plus,
  Paperclip,
  Phone,
  Mail,
  Building2,
  Tag,
  CheckSquare,
  Handshake,
  MessageSquare,
  FileText,
  User as UserIcon,
  Calendar,
  DollarSign,
  MapPin,
  TrendingUp,
  Clock,
} from "lucide-react";

interface ContactDetailProps {
  contactId: string;
  contact?: ContactDetailType | null;
  basePath: string;
  onClose: () => void;
}

export function ContactDetail({
  contactId,
  contact,
  basePath,
  onClose: _onClose,
}: ContactDetailProps) {
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState("");
  const [logActivityType, setLogActivityType] = useState<
    "CALL" | "EMAIL" | "MEETING" | null
  >(null);
  const [logNoteOpen, setLogNoteOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedToId, setTaskAssignedToId] = useState("");
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealAssignedToId, setDealAssignedToId] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(
    null,
  );

  const addNoteMutation = useAddContactNote(contactId);
  const deleteNoteMutation = useDeleteContactNote(contactId);
  const addAttachmentMutation = useAddContactAttachment(contactId);
  const deleteAttachmentMutation = useDeleteContactAttachment(contactId);
  const createTaskMutation = useCreateTask();
  const createDealMutation = useCreateDeal();
  const updateContactMutation = useUpdateContact();

  const { data: activitiesData } = useActivitiesByContact(contactId);
  const activities = activitiesData?.activities ?? [];
  const { data: usersResult } = useUsers({ limit: 10 });
  const { data: pipelinesData } = usePipelines();
  const { data: allTags } = useContactTags();
  const users: User[] = usersResult?.users ?? [];
  const pipelines = pipelinesData?.pipelines ?? [];
  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];

  const currentTagIds = contact?.tagLinks?.map((tl) => tl.tag.id) ?? [];

  const handleToggleTag = async (tagId: string) => {
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    try {
      await updateContactMutation.mutateAsync({
        id: contactId,
        data: { tagIds: newTagIds },
      });
    } catch {
      toast({ title: "Failed to update tags", variant: "destructive" });
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      await addNoteMutation.mutateAsync(noteContent.trim());
      setNoteContent("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setDeleteNoteId(noteId);
  };

  const confirmDeleteNote = async () => {
    if (!deleteNoteId) return;
    try {
      await deleteNoteMutation.mutateAsync(deleteNoteId);
      toast({ title: "Note deleted" });
      setDeleteNoteId(null);
    } catch {
      toast({ title: "Failed to delete note", variant: "destructive" });
      setDeleteNoteId(null);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentFile) return;
    try {
      await addAttachmentMutation.mutateAsync(attachmentFile);
      setAttachmentFile(null);
      toast({ title: "Attachment added" });
    } catch {
      toast({ title: "Failed to add attachment", variant: "destructive" });
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setDeleteAttachmentId(attachmentId);
  };

  const confirmDeleteAttachment = async () => {
    if (!deleteAttachmentId) return;
    try {
      await deleteAttachmentMutation.mutateAsync(deleteAttachmentId);
      toast({ title: "Attachment deleted" });
      setDeleteAttachmentId(null);
    } catch {
      toast({ title: "Failed to delete attachment", variant: "destructive" });
      setDeleteAttachmentId(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await createTaskMutation.mutateAsync({
        title: taskTitle.trim(),
        dueDate: taskDueDate || null,
        contactId,
        assignedToId: taskAssignedToId || undefined,
      });
      setTaskTitle("");
      setTaskDueDate("");
      setTaskAssignedToId("");
      toast({ title: "Task created" });
    } catch {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealName.trim()) return;
    if (!defaultPipeline) {
      toast({
        title: "No pipeline configured",
        description: "Create a pipeline in CRM Settings before creating deals.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createDealMutation.mutateAsync({
        name: dealName.trim(),
        value: dealValue ? Number(dealValue) : 0,
        contactId,
        pipelineId: defaultPipeline.id,
        assignedToId: dealAssignedToId || undefined,
      });
      setDealName("");
      setDealValue("");
      setDealAssignedToId("");
      toast({ title: "Deal created" });
    } catch (err) {
      toast({
        title: getApiErrorMessage(err, "create deal"),
        variant: "destructive",
      });
    }
  };

  if (!contact) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
        <Separator />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Build unified activity timeline (communications, activities, sales)
  const commItems = (contact.communications ?? []).map((c) => ({
    id: c.id,
    date: c.createdAt,
    kind: "comm" as const,
    label: c.type,
    subject: c.subject,
    notes: c.notes,
    creator: c.creator,
    total: null as number | null,
  }));
  const activityItems = activities.map((a) => ({
    id: a.id,
    date: a.activityAt,
    kind: "activity" as const,
    label: a.type,
    subject: a.subject,
    notes: a.notes,
    creator: a.creator,
    total: null as number | null,
  }));
  const saleItems = (contact.sales ?? []).map((s) => {
    const total = typeof s.total === "number" ? s.total : Number(s.total ?? 0);
    return {
      id: s.id,
      date: s.createdAt,
      kind: "sale" as const,
      label: "SALE",
      subject: s.saleCode ?? `Sale ${s.id.slice(0, 8)}`,
      notes: null,
      creator: null,
      total,
    };
  });
  const timeline = [...commItems, ...activityItems, ...saleItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const openDeal = contact.deals?.find((d) => d.status === "OPEN");
  const fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col h-full">
      {/* ── Contact Identity Header ────────────────────────────────────── */}
      <div className="px-6 pt-2 pb-4 border-b bg-muted/30">
        {/* Avatar + name */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">
              {contact.firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight truncate">
              {fullName}
            </h2>
            {contact.company && (
              <Link
                href={`${basePath}/crm/contacts?companyId=${contact.company.id}`}
              >
                <span className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {contact.company.name}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Contact info chips */}
        <div className="flex flex-wrap gap-2">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-background border hover:bg-muted transition-colors"
            >
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[160px]">{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-background border hover:bg-muted transition-colors"
            >
              <Phone className="h-3 w-3 text-muted-foreground" />
              {contact.phone}
            </a>
          )}
          {openDeal && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              <Handshake className="h-3 w-3" />
              {openDeal.stage}
            </span>
          )}
          {contact.purchaseCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
              <DollarSign className="h-3 w-3" />
              {contact.purchaseCount} purchase
              {contact.purchaseCount !== 1 ? "s" : ""}
            </span>
          )}
          {contact.purchaseCount >= 3 && (
            <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
              VIP
            </Badge>
          )}
          {contact.purchaseCount === 2 && (
            <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
              Repeat Buyer
            </Badge>
          )}
        </div>

        {/* Tags — inline editor */}
        <div className="flex flex-wrap gap-1 mt-2 items-center">
          {contact.tagLinks?.map((tl) => (
            <Badge
              key={tl.tag.id}
              variant="secondary"
              className="text-xs gap-1 cursor-pointer hover:bg-destructive/10 hover:line-through"
              onClick={() => handleToggleTag(tl.tag.id)}
              title={`Click to remove "${tl.tag.name}"`}
            >
              <Tag className="h-2.5 w-2.5" />
              {tl.tag.name}
            </Badge>
          ))}
          {allTags
            ?.filter((t) => !currentTagIds.includes(t.id))
            .slice(0, 5)
            .map((t) => (
              <Badge
                key={t.id}
                variant="outline"
                className="text-xs gap-1 cursor-pointer opacity-50 hover:opacity-100"
                onClick={() => handleToggleTag(t.id)}
                title={`Click to add "${t.name}"`}
              >
                <Plus className="h-2.5 w-2.5" />
                {t.name}
              </Badge>
            ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="border-b">
            <TabsList className="h-9 bg-transparent p-0 gap-0 w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
              {[
                { value: "overview", label: "Overview", icon: UserIcon },
                { value: "activity", label: "Activity", icon: MessageSquare },
                { value: "tasks", label: "Tasks", icon: CheckSquare },
                { value: "deals", label: "Deals", icon: Handshake },
                { value: "notes", label: "Notes", icon: FileText },
                { value: "files", label: "Files", icon: Paperclip },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 sm:px-3 h-9 text-xs font-medium shrink-0"
                >
                  <Icon className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{label}</span>
                  {value === "tasks" &&
                    contact.tasks &&
                    contact.tasks.length > 0 && (
                      <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5 leading-none">
                        {contact.tasks.filter((t) => !t.completed).length}
                      </span>
                    )}
                  {value === "deals" &&
                    contact.deals &&
                    contact.deals.length > 0 && (
                      <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5 leading-none">
                        {contact.deals.length}
                      </span>
                    )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            <TabsContent value="overview" className="mt-0 p-6 space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {contact.deals && contact.deals.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Handshake className="h-3 w-3" />
                      Deals
                    </div>
                    <p className="text-sm font-medium">
                      {contact.deals.filter((d) => d.status === "OPEN").length}{" "}
                      open / {contact.deals.length} total
                    </p>
                  </div>
                )}
                {contact.sales && contact.sales.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" />
                      Sales
                    </div>
                    <p className="text-sm font-medium">
                      {formatCurrency(
                        contact.sales.reduce(
                          (sum, s) =>
                            sum +
                            (typeof s.total === "number"
                              ? s.total
                              : Number(s.total ?? 0)),
                          0,
                        ),
                      )}{" "}
                      ({contact.sales.length} sale
                      {contact.sales.length !== 1 ? "s" : ""})
                    </p>
                  </div>
                )}
                {contact.tasks && contact.tasks.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <CheckSquare className="h-3 w-3" />
                      Tasks
                    </div>
                    <p className="text-sm font-medium">
                      {contact.tasks.filter((t) => !t.completed).length} pending
                    </p>
                  </div>
                )}
                {timeline.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      Last activity
                    </div>
                    <p className="text-sm font-medium">
                      {format(new Date(timeline[0]!.date), "MMM d, h:mm a")}
                    </p>
                  </div>
                )}
              </div>

              {/* CRM Fields */}
              {(contact.source || contact.journeyType) && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    CRM Info
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contact.source && (
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3" />
                          Source
                        </div>
                        <p className="text-sm font-medium">{contact.source}</p>
                      </div>
                    )}
                    {contact.journeyType && (
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          Journey Type
                        </div>
                        <p className="text-sm font-medium">
                          {contact.journeyType}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent notes preview */}
              {contact.notes && contact.notes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Notes
                  </h3>
                  <div className="space-y-2">
                    {contact.notes.slice(0, 3).map((n) => (
                      <div key={n.id} className="rounded-lg border bg-card p-3">
                        <p className="text-sm">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(n.createdAt),
                            "MMM d, yyyy 'at' h:mm a",
                          )}
                          {n.creator && ` · ${n.creator.username}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!contact.source &&
                !contact.journeyType &&
                !contact.notes?.length &&
                !(
                  contact.deals?.length ||
                  contact.sales?.length ||
                  contact.tasks?.length
                ) && (
                  <div className="text-center py-10 text-muted-foreground">
                    <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No overview data yet.</p>
                    <p className="text-xs mt-1">
                      Edit this contact to add source, journey type, and more.
                    </p>
                  </div>
                )}
            </TabsContent>

            {/* ── ACTIVITY ─────────────────────────────────────────────── */}
            <TabsContent value="activity" className="mt-0 p-6 space-y-5">
              {/* HubSpot-style action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogActivityType("CALL")}
                  className="gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Log Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogActivityType("EMAIL")}
                  className="gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Log Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogActivityType("MEETING")}
                  className="gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Log Meeting
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogNoteOpen(true)}
                  className="gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Log Note
                </Button>
              </div>

              {/* Log Activity dialogs */}
              {logActivityType && (
                <LogActivityDialog
                  open={!!logActivityType}
                  onOpenChange={(open) => !open && setLogActivityType(null)}
                  type={logActivityType}
                  contactId={contactId}
                />
              )}

              {/* Log Note dialog */}
              <Dialog
                open={logNoteOpen}
                onOpenChange={(open) => {
                  if (!open) setNoteContent("");
                  setLogNoteOpen(open);
                }}
              >
                <DialogContent className="sm:max-w-md" allowDismiss={false}>
                  <DialogHeader>
                    <DialogTitle>Log Note</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!noteContent.trim()) return;
                      try {
                        await addNoteMutation.mutateAsync(noteContent.trim());
                        setNoteContent("");
                        setLogNoteOpen(false);
                        toast({ title: "Note added" });
                      } catch {
                        toast({
                          title: "Failed to add note",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="space-y-4"
                  >
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add a note..."
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setLogNoteOpen(false);
                          setNoteContent("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          !noteContent.trim() || addNoteMutation.isPending
                        }
                      >
                        {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Timeline */}
              {timeline.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Timeline
                  </h3>
                  <div className="relative space-y-3">
                    {timeline.map((item) => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className="flex gap-3"
                      >
                        <div className="flex flex-col items-center">
                          <div className="h-7 w-7 rounded-full bg-muted border flex items-center justify-center shrink-0 text-xs">
                            {item.kind === "sale"
                              ? "💰"
                              : item.kind === "comm"
                                ? item.label === "CALL"
                                  ? "📞"
                                  : item.label === "EMAIL"
                                    ? "✉️"
                                    : "🤝"
                                : "📋"}
                          </div>
                          <div className="w-px flex-1 bg-border mt-1" />
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {item.label.toLowerCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(item.date), "MMM d, h:mm a")}
                              </span>
                            </div>
                            {item.subject && (
                              <p className="text-sm font-medium">
                                {item.subject}
                                {item.kind === "sale" && item.total != null && (
                                  <span className="ml-2 text-muted-foreground font-normal">
                                    {formatCurrency(item.total)}
                                  </span>
                                )}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.notes}
                              </p>
                            )}
                            {item.creator && (
                              <p className="text-xs text-muted-foreground mt-1.5">
                                by {item.creator.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity logged yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ── TASKS ────────────────────────────────────────────────── */}
            <TabsContent value="tasks" className="mt-0 p-6 space-y-5">
              {/* Create task form */}
              <div className="rounded-lg border bg-card">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">New Task</h3>
                </div>
                <form onSubmit={handleCreateTask} className="p-4 space-y-3">
                  <Input
                    placeholder="Task title *"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Due Date
                      </Label>
                      <Input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Assign To
                      </Label>
                      <Select
                        value={taskAssignedToId || "__none__"}
                        onValueChange={(v) =>
                          setTaskAssignedToId(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="mt-1 text-sm">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!taskTitle.trim() || createTaskMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {createTaskMutation.isPending
                      ? "Creating..."
                      : "Create Task"}
                  </Button>
                </form>
              </div>

              {/* Task list */}
              {contact.tasks && contact.tasks.length > 0 ? (
                <div className="space-y-2">
                  {contact.tasks.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-lg border p-3 flex items-start gap-3 ${
                        t.completed ? "opacity-60 bg-muted/30" : "bg-card"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border mt-0.5 shrink-0 flex items-center justify-center ${
                          t.completed
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {t.completed && (
                          <span className="text-primary-foreground text-xs">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {t.title}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {t.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(t.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          {t.assignedTo && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {t.assignedTo.username}
                            </span>
                          )}
                        </div>
                      </div>
                      {t.completed && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Done
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckSquare className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tasks yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ── DEALS ────────────────────────────────────────────────── */}
            <TabsContent value="deals" className="mt-0 p-6 space-y-5">
              {/* Create deal form */}
              <div className="rounded-lg border bg-card">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">New Deal</h3>
                </div>
                <form onSubmit={handleCreateDeal} className="p-4 space-y-3">
                  <Input
                    placeholder="Deal name *"
                    value={dealName}
                    onChange={(e) => setDealName(e.target.value)}
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Value
                      </Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={dealValue}
                          onChange={(e) => setDealValue(e.target.value)}
                          min={0}
                          className="pl-7 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Assign To
                      </Label>
                      <Select
                        value={dealAssignedToId || "__none__"}
                        onValueChange={(v) =>
                          setDealAssignedToId(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="mt-1 text-sm">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!dealName.trim() || createDealMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {createDealMutation.isPending
                      ? "Creating..."
                      : "Create Deal"}
                  </Button>
                </form>
              </div>

              {/* Deal list */}
              {contact.deals && contact.deals.length > 0 ? (
                <div className="space-y-2">
                  {contact.deals.map((d) => (
                    <Link key={d.id} href={`${basePath}/crm/deals/${d.id}`}>
                      <div className="rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {d.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(d.value)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge
                              variant={
                                d.status === "WON"
                                  ? "default"
                                  : d.status === "LOST"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {d.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {d.stage}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Handshake className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No deals yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ── NOTES ────────────────────────────────────────────────── */}
            <TabsContent value="notes" className="mt-0 p-6 space-y-4">
              <form
                onSubmit={handleAddNote}
                className="rounded-lg border bg-card"
              >
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Add Note</h3>
                </div>
                <div className="p-4 space-y-3">
                  <Textarea
                    placeholder="Write a note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!noteContent.trim() || addNoteMutation.isPending}
                    className="w-full"
                  >
                    {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </form>

              {contact.notes && contact.notes.length > 0 ? (
                <div className="space-y-2">
                  {contact.notes.map((n) => (
                    <div key={n.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{n.content}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteNote(n.id)}
                          disabled={deleteNoteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(
                          new Date(n.createdAt),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                        {n.creator && ` · ${n.creator.username}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notes yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ── FILES ────────────────────────────────────────────────── */}
            <TabsContent value="files" className="mt-0 p-6 space-y-4">
              <form
                onSubmit={handleAddAttachment}
                className="rounded-lg border bg-card"
              >
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Upload File</h3>
                </div>
                <div className="p-4 space-y-3">
                  <Input
                    type="file"
                    onChange={(e) =>
                      setAttachmentFile(e.target.files?.[0] ?? null)
                    }
                    className="text-sm"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !attachmentFile || addAttachmentMutation.isPending
                    }
                    className="w-full"
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    {addAttachmentMutation.isPending
                      ? "Uploading..."
                      : "Upload"}
                  </Button>
                </div>
              </form>

              {contact.attachments && contact.attachments.length > 0 ? (
                <div className="space-y-2">
                  {contact.attachments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border bg-card p-3 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{a.fileName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteAttachment(a.id)}
                        disabled={deleteAttachmentMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Paperclip className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No files attached.</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <AlertDialog
        open={!!deleteNoteId}
        onOpenChange={(o) => !o && setDeleteNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNote}
              disabled={deleteNoteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteAttachmentId}
        onOpenChange={(o) => !o && setDeleteAttachmentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAttachment}
              disabled={deleteAttachmentMutation.isPending}
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
