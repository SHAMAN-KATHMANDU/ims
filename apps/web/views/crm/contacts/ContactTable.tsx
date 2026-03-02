"use client";

import type { Contact } from "@/services/contactService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContactTableProps {
  contacts: Contact[];
  isLoading: boolean;
  basePath: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ContactTable({
  contacts,
  isLoading,
  basePath: _basePath,
  onView,
  onEdit,
  onDelete,
}: ContactTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Deal Stage</TableHead>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-20 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Deal Stage</TableHead>
            <TableHead>Member</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-8 text-muted-foreground"
              >
                No contacts found
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((c) => {
              const openDealStage = c.deals?.[0]?.stage;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium"
                      onClick={() => onView(c.id)}
                    >
                      {c.firstName} {c.lastName || ""}
                    </Button>
                  </TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{c.company?.name || "—"}</TableCell>
                  <TableCell>
                    {c.tagLinks?.map((l) => l.tag.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {openDealStage ? (
                      <Badge variant="outline" className="text-xs">
                        {openDealStage}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.member?.memberStatus ? (
                      <Badge variant="secondary" className="text-xs">
                        {c.member.memberStatus}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(c.id)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(c.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onDelete(c.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
