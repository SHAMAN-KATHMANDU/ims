"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContactDetail as ContactDetailType } from "@/services/contactService";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { LogActivityForm } from "../components/LogActivityForm";
import { useToast } from "@/hooks/useToast";
import { Trash2, Plus, Paperclip } from "lucide-react";

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
  onClose,
}: ContactDetailProps) {
  const { toast } = useToast();
  const [noteContent, setNoteContent] = useState("");
  const [commType, setCommType] = useState<"CALL" | "EMAIL" | "MEETING">(
    "CALL",
  );
  const [commSubject, setCommSubject] = useState("");
  const [commNotes, setCommNotes] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const addNoteMutation = useAddContactNote(contactId);
  const deleteNoteMutation = useDeleteContactNote(contactId);
  const addCommMutation = useAddContactCommunication(contactId);
  const addAttachmentMutation = useAddContactAttachment(contactId);
  const deleteAttachmentMutation = useDeleteContactAttachment(contactId);
  const { data: activitiesData } = useActivitiesByContact(contactId);
  const activities = activitiesData?.activities ?? [];

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

  if (!contact) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <h2 className="text-xl font-semibold">
          {contact.firstName} {contact.lastName || ""}
        </h2>
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="text-sm text-primary">
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <p className="text-sm text-muted-foreground">{contact.phone}</p>
        )}
        {contact.company && (
          <Link
            href={`${basePath}/crm/contacts?companyId=${contact.company.id}`}
          >
            <span className="text-sm text-primary hover:underline">
              {contact.company.name}
            </span>
          </Link>
        )}
        {contact.member && (
          <p className="text-sm text-muted-foreground">
            Member: {contact.member.name || contact.member.phone}
          </p>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 mt-4">
          {contact.notes?.length ? (
            <div>
              <h3 className="font-medium mb-2">Recent Notes</h3>
              <ul className="space-y-2">
                {contact.notes.slice(0, 5).map((n) => (
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
          {contact.communications?.length ? (
            <div>
              <h3 className="font-medium mb-2">Communications</h3>
              <ul className="space-y-2">
                {contact.communications.slice(0, 5).map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="capitalize">{c.type}</span>
                    {c.subject && `: ${c.subject}`}
                    <span className="text-muted-foreground text-xs block">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!contact.notes?.length && !contact.communications?.length && (
            <p className="text-muted-foreground text-sm">
              No activity yet. Add notes or log communications.
            </p>
          )}
        </TabsContent>
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
        <TabsContent value="communications" className="mt-4 space-y-4">
          <form
            onSubmit={handleAddCommunication}
            className="space-y-2 p-3 border rounded-lg"
          >
            <div>
              <Label>Type</Label>
              <Select
                value={commType}
                onValueChange={(v: "CALL" | "EMAIL" | "MEETING") =>
                  setCommType(v)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={commSubject}
                onChange={(e) => setCommSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={commNotes}
                onChange={(e) => setCommNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={addCommMutation.isPending}
            >
              Log Communication
            </Button>
          </form>
          {contact.communications?.length ? (
            <ul className="space-y-2">
              {contact.communications.map((c) => (
                <li key={c.id} className="text-sm p-2 bg-muted rounded">
                  <span className="capitalize font-medium">{c.type}</span>
                  {c.subject && `: ${c.subject}`}
                  {c.notes && (
                    <p className="mt-1 text-muted-foreground">{c.notes}</p>
                  )}
                  <span className="text-muted-foreground text-xs block mt-1">
                    {new Date(c.createdAt).toLocaleString()} ·{" "}
                    {c.creator?.username}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No communications logged
            </p>
          )}
        </TabsContent>
        <TabsContent value="activities" className="mt-4 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Log Activity</h3>
            <LogActivityForm
              contactId={contactId}
              memberId={contact.memberId ?? undefined}
              onSuccess={() => {}}
            />
          </div>
          {activities.length ? (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id} className="text-sm p-2 bg-muted rounded">
                  <span className="capitalize font-medium">{a.type}</span>
                  {a.subject && `: ${a.subject}`}
                  {a.notes && (
                    <p className="mt-1 text-muted-foreground">{a.notes}</p>
                  )}
                  <span className="text-muted-foreground text-xs block mt-1">
                    {new Date(a.activityAt).toLocaleString()} ·{" "}
                    {a.creator?.username}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No activities yet</p>
          )}
        </TabsContent>
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
        <TabsContent value="deals" className="mt-4">
          {contact.deals?.length ? (
            <ul className="space-y-2">
              {contact.deals.map((d) => (
                <li key={d.id}>
                  <Link href={`${basePath}/crm/deals/${d.id}`}>
                    <span className="font-medium hover:underline">
                      {d.name}
                    </span>
                  </Link>
                  <span className="text-muted-foreground text-sm ml-2">
                    {formatCurrency(d.value)} · {d.stage}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No deals</p>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4">
        <Link href={`${basePath}/crm/contacts/${contactId}/edit`}>
          <Button>Edit</Button>
        </Link>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
