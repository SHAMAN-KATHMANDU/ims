"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  teamMembersService,
  type InviteMemberData,
  type UpdateMemberData,
} from "../services/team-members.service";

export type {
  InviteMemberData,
  UpdateMemberData,
  MemberRole,
} from "../services/team-members.service";

export const teamMemberKeys = {
  all: ["team-members"] as const,
  list: () => [...teamMemberKeys.all, "list"] as const,
  detail: (id: string) => [...teamMemberKeys.all, "detail", id] as const,
};

export function useTeamMembers() {
  return useQuery({
    queryKey: teamMemberKeys.list(),
    queryFn: teamMembersService.listMembers,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: InviteMemberData) =>
      teamMembersService.inviteMember(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamMemberKeys.list() });
      toast({ title: "Member invited" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to invite member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMemberData }) =>
      teamMembersService.updateMemberRole(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: teamMemberKeys.list() });
      qc.invalidateQueries({ queryKey: teamMemberKeys.detail(id) });
      toast({ title: "Member role updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update member role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => teamMembersService.removeMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamMemberKeys.list() });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
