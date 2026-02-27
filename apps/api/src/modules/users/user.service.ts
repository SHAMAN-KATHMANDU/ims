import bcrypt from "bcryptjs";
import { type Role } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import { getPaginationParams } from "@/utils/pagination";
import userRepository, { UserRepository } from "./user.repository";
import type { CreateUserDto, UpdateUserDto } from "./user.schema";

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

    await this.repo.delete(id);
  }
}

export default new UserService(userRepository);
