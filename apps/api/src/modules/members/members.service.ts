/**
 * Members service - business logic for members module.
 */

import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/shared/errors";
import { AppError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { membersRepository } from "./members.repository";

const ALLOWED_SORT_FIELDS = ["createdAt", "updatedAt", "name", "id"] as const;

function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, "").trim();
}

export interface MemberListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateMemberInput {
  phone: string;
  name?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface UpdateMemberInput {
  phone?: string;
  name?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export const membersService = {
  async create(tenantId: string, input: CreateMemberInput) {
    const normalizedPhone = normalizePhone(input.phone);
    const existing = await membersRepository.findMemberByPhone(
      tenantId,
      normalizedPhone,
    );
    if (existing) {
      throw new AppError("Member with this phone number already exists", 409);
    }
    return membersRepository.createMember({
      tenantId,
      phone: normalizedPhone,
      name: input.name ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
    });
  },

  async getAll(tenantId: string, filters: MemberListFilters) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(filters);
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      createdAt: "desc",
    };
    const where: Prisma.MemberWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const skip = (page - 1) * limit;
    const [totalItems, members] = await Promise.all([
      membersRepository.countMembers(where),
      membersRepository.findMembers({ where, orderBy, skip, take: limit }),
    ]);
    return createPaginationResult(members, totalItems, page, limit);
  },

  async getByPhone(tenantId: string, phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const member = await membersRepository.findMemberByPhone(
      tenantId,
      normalizedPhone,
    );
    if (!member) throw new NotFoundError("Member not found");
    return member;
  },

  async getById(id: string, tenantId: string) {
    const member = await membersRepository.findMemberByIdWithSales(
      id,
      tenantId,
    );
    if (!member) throw new NotFoundError("Member not found");
    return member;
  },

  async update(id: string, tenantId: string, input: UpdateMemberInput) {
    const existing = await membersRepository.findMemberByIdForUpdate(
      id,
      tenantId,
    );
    if (!existing) throw new NotFoundError("Member not found");

    const updateData: Prisma.MemberUpdateInput = {};
    if (input.phone !== undefined) {
      const normalizedPhone = normalizePhone(input.phone);
      if (normalizedPhone !== existing.phone) {
        const phoneExists = await membersRepository.findMemberByPhone(
          tenantId,
          normalizedPhone,
        );
        if (phoneExists) {
          throw new AppError(
            "Phone number already taken by another member",
            409,
          );
        }
      }
      updateData.phone = normalizePhone(input.phone);
    }
    if (input.name !== undefined) updateData.name = input.name ?? null;
    if (input.email !== undefined) updateData.email = input.email ?? null;
    if (input.notes !== undefined) updateData.notes = input.notes ?? null;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return membersRepository.updateMember(id, updateData);
  },

  async checkMember(tenantId: string, phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const member = await membersRepository.findMemberByPhoneLight(
      tenantId,
      normalizedPhone,
    );
    return {
      isMember: !!member && member.isActive,
      member: member ?? null,
    };
  },
};
