import dotenv from "dotenv";
import prisma from "@/config/prisma";

dotenv.config();

const dbConnect = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL");
  } catch (error) {
    console.log("Error connecting to PostgreSQL", error);
    process.exit(1);
  }
};

export default dbConnect;
