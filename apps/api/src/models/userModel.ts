import prisma from "../config/prisma";

// Role type definition (matches Prisma enum)
export type Role = "superAdmin" | "admin" | "user";

export default prisma.user;