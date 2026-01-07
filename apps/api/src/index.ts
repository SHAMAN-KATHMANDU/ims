import http from "http";
import app from "@/config/express.config"
import dotenv from "dotenv";
import prisma from "@/config/prisma";
import dbConnect from "@/config/dbConnect";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "4000", 10);
const HOST: string = process.env.HOST || "0.0.0.0";

// Graceful shutdown
let httpServer: http.Server | null = null;

const startServer = async () => {
  try {
    // Wait for database connection before starting the server
    await dbConnect();
    
    httpServer = http.createServer(app);
    
    httpServer.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  if (httpServer) {
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  if (httpServer) {
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
