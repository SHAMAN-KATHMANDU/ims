"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/useToast";
import {
  Can,
  useAssignUserToRole,
  useRoleMembers,
  useUnassignUserFromRole,
  type Role,
} from "@/features/permissions";
import { useUsers } from "@/features/users";

interface RoleMembersPanelProps {
  roleId: string;
  role: Role;
}

export function RoleMembersPanel({ roleId, role }: RoleMembersPanelProps) {
  const { toast } = useToast();
  const { data: members = [], isLoading } = useRoleMembers(roleId);
  const memberIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const { data: usersResult } = useUsers({
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const candidateUsers = usersResult?.users ?? [];

  const assignMutation = useAssignUserToRole();
  const unassignMutation = useUnassignUserFromRole();

  const handleAssign = async (userId: string) => {
    try {
      await assignMutation.mutateAsync({ roleId, userId });
      toast({ title: "User added to role" });
    } catch (err) {
      toast({
        title: "Failed to add user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleUnassign = async (userId: string) => {
    try {
      await unassignMutation.mutateAsync({ roleId, userId });
      toast({ title: "User removed from role" });
    } catch (err) {
      toast({
        title: "Failed to remove user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (role.isSystem) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        System role memberships are managed automatically.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Can perm="SETTINGS.ROLES.ASSIGN">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" /> Add member
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <CommandInput
                  placeholder="Search users…"
                  value={searchInput}
                  onValueChange={setSearchInput}
                />
              </div>
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {candidateUsers.map((u) => {
                    const already = memberIds.has(u.id);
                    return (
                      <CommandItem
                        key={u.id}
                        value={u.id}
                        onSelect={() => {
                          if (!already) handleAssign(u.id);
                        }}
                        disabled={already}
                      >
                        <Avatar className="mr-2 h-6 w-6">
                          <AvatarFallback>
                            {u.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{u.username}</span>
                        {already && (
                          <Check className="ml-2 h-4 w-4 text-muted-foreground" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </Can>

      <div className="rounded-md border">
        {isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading members…
          </div>
        )}
        {!isLoading && members.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No members yet.
          </div>
        )}
        {!isLoading && members.length > 0 && (
          <ul className="divide-y">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {m.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{m.username}</div>
                    <Badge variant="secondary" className="text-[10px]">
                      {m.role}
                    </Badge>
                  </div>
                </div>
                <Can perm="SETTINGS.ROLES.ASSIGN">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnassign(m.userId)}
                    aria-label={`Remove ${m.username}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Can>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
