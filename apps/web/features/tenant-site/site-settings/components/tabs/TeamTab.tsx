"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/useToast";
import {
  useTeamMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  type MemberRole,
} from "../../../hooks/use-team-members";

export function TeamTab() {
  const { toast } = useToast();
  const { data: members, isLoading } = useTeamMembers();
  const inviteMember = useInviteMember();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("user");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await inviteMember.mutateAsync({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("user");
      setInviteOpen(false);
    } catch {
      toast({
        title: "Failed to invite member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: MemberRole) => {
    try {
      await updateMemberRole.mutateAsync({
        id: memberId,
        payload: { role: newRole },
      });
    } catch {
      toast({
        title: "Failed to update member role",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
    } catch {
      toast({
        title: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading team members…</div>
    );
  }

  const teamMembers = members ?? [];

  return (
    <div className="space-y-4">
      {/* Invite dialog */}
      <div className="flex justify-end">
        <AlertDialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Invite member
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Invite team member</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as MemberRole)}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleInvite}>
                {inviteMember.isPending ? "Inviting…" : "Send invite"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Team members list */}
      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold bg-muted/30">
          {teamMembers.length} members
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No team members yet
          </div>
        ) : (
          teamMembers.map((member) => (
            <div
              key={member.id}
              className="px-4 py-3 border-t grid grid-cols-[32px_1.4fr_120px_32px] gap-3 items-center hover:bg-muted/30 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                {(member.username ?? member.email).charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium">
                  {member.username ?? member.email}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {member.email}
                </div>
              </div>
              <Select
                value={member.role}
                onValueChange={(newRole) =>
                  handleUpdateRole(member.id, newRole as MemberRole)
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {member.username ?? member.email} will lose access to this
                      workspace.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(member.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {removeMember.isPending ? "Removing…" : "Remove"}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
