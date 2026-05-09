"use client";

import { Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

const TEAM_MEMBERS = [
  {
    id: "t1",
    name: "Alex Park",
    email: "alex@lumenandcoal.com",
    role: "Owner",
    status: "active",
    isYou: true,
  },
  {
    id: "t2",
    name: "Noor Asante",
    email: "noor@lumenandcoal.com",
    role: "Editor",
    status: "active",
  },
  {
    id: "t3",
    name: "Tomás Vela",
    email: "tomas@lumenandcoal.com",
    role: "Editor",
    status: "active",
  },
  {
    id: "t4",
    name: "Mira Halsey",
    email: "mira@lumenandcoal.com",
    role: "Author",
    status: "active",
  },
  {
    id: "t5",
    name: "Reed Quill",
    email: "reed@lumenandcoal.com",
    role: "Viewer",
    status: "pending",
  },
  {
    id: "t6",
    name: "Sasha Boren",
    email: "sasha@lumenandcoal.com",
    role: "Viewer",
    status: "pending",
  },
];

export function TeamTab() {
  const { toast } = useToast();

  const handleInvite = () => {
    toast({ title: "Invite dialog would open here (stubbed)" });
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/30">
        <div className="text-sm font-semibold">
          {TEAM_MEMBERS.length} members · 2 pending
        </div>
        <Button size="sm" onClick={handleInvite}>
          <Plus className="w-4 h-4 mr-1" />
          Invite
        </Button>
      </div>

      {TEAM_MEMBERS.map((member) => (
        <div
          key={member.id}
          className="px-4 py-3 border-t grid grid-cols-[32px_1.4fr_100px_100px_32px] gap-3 items-center hover:bg-muted/30 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
            {member.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              {member.name}
              {member.isYou && (
                <span className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {member.email}
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            {member.role}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded ${
              member.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {member.status === "active" ? "Active" : "Pending"}
          </span>
          <button className="p-1.5 hover:bg-muted rounded transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </Card>
  );
}
