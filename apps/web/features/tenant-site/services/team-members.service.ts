import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export type MemberRole = "admin" | "user";

export interface TeamMember {
  id: string;
  tenantId: string;
  email: string;
  username?: string | null;
  role: MemberRole;
  invitedAt?: string | null;
  joinedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteMemberData {
  email: string;
  role?: MemberRole;
}

export interface UpdateMemberData {
  role: MemberRole;
}

export const teamMembersService = {
  async listMembers(): Promise<TeamMember[]> {
    try {
      const { data } = await api.get<{ members: TeamMember[] }>("/members");
      return data.members ?? [];
    } catch (error) {
      throw handleApiError(error, "listMembers");
    }
  },

  async inviteMember(payload: InviteMemberData): Promise<TeamMember> {
    try {
      const { data } = await api.post<{ member: TeamMember }>(
        "/members",
        payload,
      );
      return data.member;
    } catch (error) {
      throw handleApiError(error, "inviteMember");
    }
  },

  async updateMemberRole(
    memberId: string,
    payload: UpdateMemberData,
  ): Promise<TeamMember> {
    try {
      const { data } = await api.patch<{ member: TeamMember }>(
        `/members/${memberId}`,
        payload,
      );
      return data.member;
    } catch (error) {
      throw handleApiError(error, "updateMemberRole");
    }
  },

  async removeMember(memberId: string): Promise<void> {
    try {
      await api.delete(`/members/${memberId}`);
    } catch (error) {
      throw handleApiError(error, "removeMember");
    }
  },
};
