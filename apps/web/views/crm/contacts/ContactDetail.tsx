"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContactDetail as ContactDetailType } from "@/services/contactService";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  useAddContactCommunication,
  useAddContactAttachment,
  useDeleteContactAttachment,
} from "@/hooks/useContacts";
import { useActivitiesByContact } from "@/hooks/useActivities";
import { useCreateTask } from "@/hooks/useTasks";
import { useCreateDeal } from "@/hooks/useDeals";
import { useUsers, type User } from "@/hooks/useUser";
import { LogActivityForm } from "../components/LogActivityForm";
import { useToast } from "@/hooks/useToast";
import {
  Trash2,
  Plus,
  Paperclip,
  Phone,
  Mail,
  Building2,
  Tag,
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

  // Notes state
  const [noteContent, setNoteContent] = useState("");

  // Communication state
  const [commType, setCommType] = useState<"CALL" | "EMAIL" | "MEETING">(
    "CALL",
  );
  const [commSubject, setCommSubject] = useState("");
  const [commNotes, setCommNotes] = useState("");

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Quick task creation state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedToId, setTaskAssignedToId] = useState("");

  // Quick deal creation state
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealAssignedToId, setDealAssignedToId] = useState("");

  const addNoteMutation = useAddContactNote(contactId);
  const deleteNoteMutation = useDeleteContactNote(contactId);
  const addCommMutation = useAddContactCommunication(contactId);
  const addAttachmentMutation = useAddContactAttachment(contactId);
  const deleteAttachmentMutation = useDeleteContactAttachment(contactId);
  const createTaskMutation = useCreateTask();
  const createDealMutation = useCreateDeal();

  const { data: activitiesData } = useActivitiesByContact(contactId);
  const activities = activitiesData?.activities ?? [];

  const { data: usersResult } = useUsers({ limit: 200 });
  const users: User[] = usersResult?.users ?? [];

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

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNoteMutation.mutateAsync(noteId);
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  };

  const handleAddCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCommMutation.mutateAsync({
        type: commType,
        subject: commSubject.trim() || undefined,
        notes: commNotes.trim() || undefined,
      });
      setCommSubject("");
      setCommNotes("");
      toast({ title: "Communication logged" });
    } catch {
      toast({ title: "Failed to log communication", variant: "destructive" });
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

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
      toast({ title: "Attachment deleted" });
    } catch {
      toast({ title: "Failed to delete attachment", variant: "destructive" });
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
    try {
      await createDealMutation.mutateAsync({
        name: dealName.trim(),
        value: dealValue ? Number(dealValue) : 0,
        contactId,
        assignedToId: dealAssignedToId || undefined,
      });
      setDealName("");
      setDealValue("");
      setDealAssignedToId("");
      toast({ title: "Deal created" });
    } catch {
      toast({ title: "Failed to create deal", variant: "destructive" });
    }
  };

  if (!contact) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // Build unified activity timeline (communications + activities)
  const commItems = (contact.communications ?? []).map((c) => ({
    id: c.id,
    date: c.createdAt,
    type: "comm" as const,
    label: c.type,
    subject: c.subject,
    notes: c.notes,
    creator: c.creator,
  }));
  const activityItems = activities.map((a) => ({
    id: a.id,
    date: a.activityAt,
    type: "activity" as const,
    label: a.type,
    subject: a.subject,
    notes: a.notes,
    creator: a.creator,
  }));
  const timeline = [...commItems, ...activityItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const openDeal = contact.deals?.find((d) => d.status === "OPEN");

  return (
    <div className="space-y-4 py-4">
      {/* Contact header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">
          {contact.firstName} {contact.lastName || ""}
        </h2>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Mail className="h-3 w-3" /> {contact.email}
            </a>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {contact.phone}
            </span>
          )}
          {contact.company && (
            <Link
              href={`${basePath}/crm/contacts?companyId=${contact.company.id}`}
            >
              <span className="flex items-center gap-1 text-primary hover:underline">
                <Building2 className="h-3 w-3" /> {contact.company.name}
              </span>
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {contact.tagLinks?.map((tl) => (
            <Badge key={tl.tag.id} variant="secondary" className="text-xs">
              <Tag className="h-2.5 w-2.5 mr-1" /> {tl.tag.name}
            </Badge>
          ))}
          {openDeal && (
            <Badge variant="outline" className="text-xs">
              Deal: {openDeal.stage}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {contact.source && (
              <div>
                <span className="text-muted-foreground">Source</span>
                <p className="font-medium">{contact.source}</p>
              </div>
            )}
            {contact.journeyType && (
              <div>
                <span className="text-muted-foreground">Journey Type</span>
                <p className="font-medium">{contact.journeyType}</p>
              </div>
            )}
          </div>

          {/* Member card */}
          {contact.member && (
            <div className="p-3 border rounded-lg space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Member</span>
                {contact.member.memberStatus && (
                  <Badge variant="secondary">
                    {contact.member.memberStatus}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {contact.member.name || contact.member.phone}
              </p>
              {contact.member.totalSales != null && (
                <p className="text-muted-foreground">
                  Total sales:{" "}
                  {formatCurrency(Number(contact.member.totalSales))}
                </p>
              )}
              {contact.member.memberSince && (
                <p className="text-muted-foreground">
                  Member since:{" "}
                  {new Date(contact.member.memberSince).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Recent notes preview */}
          {contact.notes?.length ? (
            <div>
              <h3 className="font-medium mb-2 text-sm">Recent Notes</h3>
              <ul className="space-y-2">
                {contact.notes.slice(0, 3).map((n) => (
                  <li key={n.id} className="text-sm p-2 bg-muted rounded">
                    {n.content}
                    <span className="text-muted-foreground text-xs block mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!contact.notes?.length &&
            !contact.member &&
            !contact.source &&
            !contact.journeyType && (
              <p className="text-muted-foreground text-sm">
                No overview data yet.
              </p>
            )}
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <Textarea
              placeholder="Add a note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!noteContent.trim() || addNoteMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          {contact.notes?.length ? (
            <ul className="space-y-2">
              {contact.notes.map((n) => (
                <li
                  key={n.id}
                  className="text-sm p-2 bg-muted rounded flex justify-between items-start gap-2"
                >
                  <div>
                    {n.content}
                    <span className="text-muted-foreground text-xs block mt-1">
                      {new Date(n.createdAt).toLocaleString()} ·{" "}
                      {n.creator?.username}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => handleDeleteNote(n.id)}
                    disabled={deleteNoteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No notes yet</p>
          )}
        </TabsContent>

        {/* ACTIVITY TAB (merged communications + activities) */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          <div className="space-y-3 p-3 border rounded-lg">
            <h3 className="font-medium text-sm">Log Interaction</h3>
            <form onSubmit={handleAddCommunication} className="space-y-2">
              <Select
                value={commType}
                onValueChange={(v: "CALL" | "EMAIL" | "MEETING") =>
                  setCommType(v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={commSubject}
                onChange={(e) => setCommSubject(e.target.value)}
                placeholder="Subject (optional)"
              />
              <Textarea
                value={commNotes}
                onChange={(e) => setCommNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
              />
              <Button
                type="submit"
                size="sm"
                disabled={addCommMutation.isPending}
              >
                Log Communication
              </Button>
            </form>
            <div className="border-t pt-3">
              <h3 className="font-medium text-sm mb-2">Log Activity</h3>
              <LogActivityForm
                contactId={contactId}
                memberId={contact.memberId ?? undefined}
                onSuccess={() => {}}
              />
            </div>
          </div>

          {timeline.length ? (
            <ul className="space-y-2">
              {timeline.map((item) => (
                <li key={item.id} className="text-sm p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.label}
                    </Badge>
                    {item.subject && (
                      <span className="font-medium">{item.subject}</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="mt-1 text-muted-foreground">{item.notes}</p>
                  )}
                  <span className="text-muted-foreground text-xs block mt-1">
                    {new Date(item.date).toLocaleString()} ·{" "}
                    {item.creator?.username}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No activity logged yet
            </p>
          )}
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <form
            onSubmit={handleCreateTask}
            className="space-y-2 p-3 border rounded-lg"
          >
            <h3 className="font-medium text-sm">Quick Create Task</h3>
            <Input
              placeholder="Task title *"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <Input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
            <Select
              value={taskAssignedToId || "__none__"}
              onValueChange={(v) =>
                setTaskAssignedToId(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to (optional)" />
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
            <Button
              type="submit"
              size="sm"
              disabled={!taskTitle.trim() || createTaskMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Task
            </Button>
          </form>

          {contact.tasks?.length ? (
            <ul className="space-y-2">
              {contact.tasks.map((t) => (
                <li
                  key={t.id}
                  className="text-sm p-2 bg-muted rounded flex justify-between items-center"
                >
                  <div>
                    <span
                      className={
                        t.completed
                          ? "line-through text-muted-foreground"
                          : "font-medium"
                      }
                    >
                      {t.title}
                    </span>
                    {t.dueDate && (
                      <span className="text-muted-foreground text-xs block mt-0.5">
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {t.assignedTo && (
                      <span className="text-muted-foreground text-xs block">
                        Assigned to: {t.assignedTo.username}
                      </span>
                    )}
                  </div>
                  {t.completed && (
                    <Badge variant="secondary" className="text-xs">
                      Done
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No tasks yet</p>
          )}
        </TabsContent>

        {/* DEALS TAB */}
        <TabsContent value="deals" className="mt-4 space-y-4">
          <form
            onSubmit={handleCreateDeal}
            className="space-y-2 p-3 border rounded-lg"
          >
            <h3 className="font-medium text-sm">Quick Create Deal</h3>
            <Input
              placeholder="Deal name *"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Value (optional)"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              min={0}
            />
            <Select
              value={dealAssignedToId || "__none__"}
              onValueChange={(v) =>
                setDealAssignedToId(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to (optional)" />
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
            <Button
              type="submit"
              size="sm"
              disabled={!dealName.trim() || createDealMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Deal
            </Button>
          </form>

          {contact.deals?.length ? (
            <ul className="space-y-2">
              {contact.deals.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div>
                    <Link href={`${basePath}/crm/deals/${d.id}`}>
                      <span className="font-medium hover:underline">
                        {d.name}
                      </span>
                    </Link>
                    <span className="text-muted-foreground text-sm ml-2">
                      {formatCurrency(d.value)}
                    </span>
                  </div>
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
                    {d.stage}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No deals yet</p>
          )}
        </TabsContent>

        {/* ATTACHMENTS TAB */}
        <TabsContent value="attachments" className="mt-4 space-y-4">
          <form onSubmit={handleAddAttachment} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Upload file</Label>
              <Input
                type="file"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!attachmentFile || addAttachmentMutation.isPending}
            >
              <Paperclip className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>
          {contact.attachments?.length ? (
            <ul className="space-y-2">
              {contact.attachments.map((a) => (
                <li
                  key={a.id}
                  className="text-sm p-2 bg-muted rounded flex justify-between items-center"
                >
                  <span>{a.fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive"
                    onClick={() => handleDeleteAttachment(a.id)}
                    disabled={deleteAttachmentMutation.isPending}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No attachments</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
