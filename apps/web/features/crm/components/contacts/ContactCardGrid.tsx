"use client";

import type { Contact } from "../../services/contact.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "../shared";
import { cn } from "@/lib/utils";

interface ContactCardGridProps {
  contacts: Contact[];
  isLoading?: boolean;
  onOpen: (id: string) => void;
}

export function ContactCardGrid({
  contacts,
  isLoading = false,
  onOpen,
}: ContactCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[200px] rounded-lg border bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-sm">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {contacts.map((contact) => {
        const fullName = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ");
        const initials = (
          contact.firstName.charAt(0) + (contact.lastName?.charAt(0) ?? "")
        ).toUpperCase();

        return (
          <Card
            key={contact.id}
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow p-4 space-y-3",
              "bg-card border",
            )}
            onClick={() => onOpen(contact.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                // Space would otherwise scroll the page; match native button behavior.
                e.preventDefault();
                onOpen(contact.id);
              }
            }}
          >
            {/* Avatar + name */}
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14.5px] font-semibold truncate">
                  {fullName}
                </h3>
                {contact.company && (
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.company.name}
                  </p>
                )}
              </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5">
              <TierBadge purchaseCount={contact.purchaseCount} />
              {contact.journeyType && (
                <Badge variant="secondary" className="text-xs">
                  {contact.journeyType}
                </Badge>
              )}
            </div>

            {/* Purchase count */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <span className="font-mono text-lg font-semibold text-primary">
                {contact.purchaseCount}
              </span>
              <span className="text-xs text-muted-foreground">
                purchase{contact.purchaseCount !== 1 ? "s" : ""}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
