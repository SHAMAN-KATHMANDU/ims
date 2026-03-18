import http from "http";
import app from "@/config/express.config";
import { basePrisma as prisma } from "@/config/prisma";
import dbConnect from "@/config/dbConnect";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { startTrashCleanupCron } from "@/jobs/trashCleanup";
import { startRemarketingScheduler } from "@/modules/remarketing/remarketing.scheduler";
import { setupSocketIO } from "@/config/socket.config";

// Import workers so they start processing jobs
import "@/queues/inbound-message.worker";
import "@/queues/outbound-message.worker";
import "@/queues/status-update.worker";

// Note: dotenv.config() is called in env.ts - do not call it here
const PORT = env.port;
const HOST = env.host;

// Graceful shutdown
let httpServer: http.Server | null = null;

const startServer = async () => {
  try {
    // Startup validation checks
    logger.log("Starting server...");
    logger.log(`Environment: ${env.nodeEnv}`);
    logger.log(`Port: ${PORT}, Host: ${HOST}`);

    // Validate environment configuration
    if (env.isProd || env.isStaging) {
      logger.log("Production/Staging mode - validating configuration....");
      if (!env.jwtSecret) {
        logger.error("FATAL: JWT_SECRET is required in production/staging");
        process.exit(1);
      }
      if (!env.databaseUrl) {
        logger.error("FATAL: DATABASE_URL is required in production/staging");
        process.exit(1);
      }
      if (env.corsOrigin === "*") {
        logger.warn(
          "WARNING: CORS is set to '*' in production/staging - this is insecure!",
        );
      }
    }

    // Wait for database connection before starting the server
    logger.log("Connecting to database...");
    await dbConnect();
    logger.log("Database connection established");

    // Verify database connectivity with a simple query
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.log("Database health check passed");
    } catch (dbError) {
      logger.error("Database health check failed", undefined, dbError);
      throw dbError;
    }

    httpServer = http.createServer(app);

    // Set up Socket.IO for real-time messaging
    setupSocketIO(httpServer);
    logger.log("Socket.IO server initialized");

    httpServer.listen(PORT, HOST, () => {
      logger.log(`Server running on http://${HOST}:${PORT}`);
      logger.log(
        `CORS origins: ${Array.isArray(env.corsOrigin) ? env.corsOrigin.join(", ") : env.corsOrigin}`,
      );
      startTrashCleanupCron();
      startRemarketingScheduler();
      logger.log("BullMQ workers started");
      logger.log("Server startup complete");
    });
  } catch (error) {
    logger.error("Failed to start server", undefined, error);
    process.exit(1);
  }
};

startServer();

process.on("SIGINT", async () => {
  logger.log("Shutting down gracefully...");
  await prisma.$disconnect();
  if (httpServer) {
    httpServer.close(() => {
      logger.log("Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  logger.log("Shutting down gracefully...");
  await prisma.$disconnect();
  if (httpServer) {
    httpServer.close(() => {
      logger.log("Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
