"use client";

import type { Contact } from "../../services/contact.service";
import {
  SortableTableHead,
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
import { Building2, Mail, Phone } from "lucide-react";
import type { SortOrder } from "@/components/ui/table";
import { getActiveJourneyType } from "../../utils/journey-type";

type ContactEmptyVariant = "empty" | "no-results";

interface ContactTableProps {
  contacts: Contact[];
  isLoading: boolean;
  /** Background refetch — table stays visible with dimmed state */
  isFetching?: boolean;
  basePath: string;
  dealsEnabled: boolean;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  emptyVariant?: ContactEmptyVariant;
  onClearFilters?: () => void;
}

export function ContactTable({
  contacts,
  isLoading,
  isFetching = false,
  basePath: _basePath,
  dealsEnabled,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  emptyVariant = "empty",
  onClearFilters,
}: ContactTableProps) {
  if (isLoading) {
    return (
      <>
        {/* Mobile skeleton */}
        <div className="sm:hidden space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden sm:block overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                {dealsEnabled && <TableHead>Deal Stage</TableHead>}
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
                  {dealsEnabled && (
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  if (contacts.length === 0) {
    if (emptyVariant === "no-results") {
      return (
        <div className="rounded-md border py-8 text-center space-y-3 px-4">
          <p className="text-muted-foreground text-sm">
            No contacts match your search or filters. Try different keywords or
            clear filters to see everyone.
          </p>
          {onClearFilters ? (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="rounded-md border py-8 text-center text-muted-foreground px-4 space-y-1">
        <p className="font-medium text-foreground">No contacts yet</p>
        <p className="text-sm">
          Add a contact or import a list to get started.
        </p>
      </div>
    );
  }

  const dimmed = isFetching && !isLoading;

  return (
    <div
      className={
        dimmed
          ? "opacity-70 transition-opacity duration-[var(--duration-normal,200ms)]"
          : "transition-opacity duration-[var(--duration-normal,200ms)]"
      }
    >
      {/* ── Mobile card list ─────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {contacts.map((c) => {
          const activeJourneyType = getActiveJourneyType(c.deals);
          const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
          return (
            <div key={c.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onView(c.id)}
                  className="text-sm font-semibold text-left hover:text-primary transition-colors"
                >
                  {fullName}
                </button>
                {dealsEnabled && activeJourneyType && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {activeJourneyType}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </span>
                )}
                {c.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {c.company.name}
                  </span>
                )}
              </div>

              {c.tagLinks && c.tagLinks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.tagLinks.map((l) => (
                    <Badge
                      key={l.tag.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {l.tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-1 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => onView(c.id)}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => onEdit(c.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1 text-destructive hover:text-destructive"
                  onClick={() => onDelete(c.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                sortKey="firstName"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort}
              >
                Name
              </SortableTableHead>
              <SortableTableHead
                sortKey="email"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort}
              >
                Email
              </SortableTableHead>
              <SortableTableHead
                sortKey="phone"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort}
              >
                Phone
              </SortableTableHead>
              <SortableTableHead
                sortKey="companyId"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort}
              >
                Company
              </SortableTableHead>
              <TableHead>Tags</TableHead>
              {dealsEnabled && <TableHead>Deal Stage</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => {
              const activeJourneyType = getActiveJourneyType(c.deals);
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
                  {dealsEnabled && (
                    <TableCell>
                      {activeJourneyType ? (
                        <Badge variant="outline" className="text-xs">
                          {activeJourneyType}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
