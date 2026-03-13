import bcrypt from "bcryptjs";
import { type Role } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import { getPaginationParams } from "@/utils/pagination";
import userRepository, { UserRepository } from "./user.repository";
import passwordResetRepository from "./password-reset.repository";
import type {
  CreateUserDto,
  UpdateUserDto,
  ApprovePasswordResetDto,
} from "./user.schema";

const BCRYPT_ROUNDS = 10;

export class UserService {
  constructor(private repo: UserRepository) {}

  async create(tenantId: string, data: CreateUserDto) {
    const existing = await this.repo.findByUsername(data.username);
    if (existing) {
      throw createError("User with this username already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    return this.repo.create(tenantId, { ...data, hashedPassword });
  }

  async findAll(rawQuery: Record<string, unknown>) {
    const query = getPaginationParams(rawQuery);
    return this.repo.findAll(query);
  }

  async findById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw createError("User not found", 404);
    return user;
  }

  async update(id: string, requestingUserId: string, data: UpdateUserDto) {
    const existing = await this.repo.findByIdRaw(id);
    if (!existing) throw createError("User not found", 404);

    const updateData: { username?: string; password?: string; role?: Role } =
      {};

    if (data.username !== undefined) {
      const conflict = await this.repo.findByUsernameExcluding(
        data.username,
        id,
      );
      if (conflict) throw createError("Username already taken", 409);
      updateData.username = data.username;
    }

    if (data.password !== undefined) {
      updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    if (data.role !== undefined) {
      updateData.role = data.role as Role;
    }

    return this.repo.update(id, updateData);
  }

  async delete(id: string, requestingUserId: string) {
    const existing = await this.repo.findByIdRaw(id);
    if (!existing) throw createError("User not found", 404);

    if (requestingUserId === id) {
      throw createError("You cannot delete your own account", 400);
    }

    if (existing.role === "platformAdmin") {
      throw createError("Cannot delete the platform admin.", 403);
    }

    await this.repo.delete(id);
  }

  async getPasswordResetRequests(tenantId: string) {
    return passwordResetRepository.findForTenant(tenantId);
  }

  async approveResetRequest(
    requestId: string,
    tenantId: string,
    handledById: string,
    data: ApprovePasswordResetDto,
  ) {
    const req = await passwordResetRepository.findById(requestId);
    if (!req) throw createError("Password reset request not found", 404);
    if (req.tenantId !== tenantId)
      throw createError("Request does not belong to your organization", 403);
    if (req.status === "ESCALATED")
      throw createError(
        "Escalated requests must be handled by platform admin",
        403,
      );
    if (req.status !== "PENDING")
      throw createError("Request has already been handled", 400);

    const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    await passwordResetRepository.approve(
      requestId,
      handledById,
      hashedPassword,
    );
  }

  async escalateResetRequest(requestId: string, tenantId: string) {
    const req = await passwordResetRepository.findById(requestId);
    if (!req) throw createError("Password reset request not found", 404);
    if (req.tenantId !== tenantId)
      throw createError("Request does not belong to your organization", 403);
    if (req.status === "ESCALATED")
      throw createError("Request is already escalated", 400);
    if (req.status !== "PENDING")
      throw createError("Request has already been handled", 400);

    return passwordResetRepository.escalate(requestId);
  }

  async rejectResetRequest(
    requestId: string,
    tenantId: string,
    handledById: string,
  ) {
    const req = await passwordResetRepository.findById(requestId);
    if (!req) throw createError("Password reset request not found", 404);
    if (req.tenantId !== tenantId)
      throw createError("Request does not belong to your organization", 403);
    if (req.status !== "PENDING")
      throw createError("Request has already been handled", 400);

    return passwordResetRepository.reject(requestId, handledById);
  }
}

export default new UserService(userRepository);
