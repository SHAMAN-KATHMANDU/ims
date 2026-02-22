import prisma from "@/config/prisma";
import { logger } from "@/config/logger";

// Note: dotenv.config() is called in env.ts - do not call it here

const dbConnect = async () => {
  try {
    await prisma.$connect();
    logger.log("Connected to PostgreSQL");
  } catch (error) {
    logger.error("Error connecting to PostgreSQL", error);
    process.exit(1);
  }
};

export default dbConnect;
