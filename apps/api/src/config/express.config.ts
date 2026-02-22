import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "@/config/router.config";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger.config";
import { env } from "@/config/env";
import { errorHandler } from "@/middlewares/errorHandler";
import { requestIdMiddleware } from "@/middlewares/requestId";
import { requestLoggingMiddleware } from "@/middlewares/requestLogging";
import { basePrisma as prisma } from "@/config/prisma";
import { getVersion } from "@/config/version";

const app = express();

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Request timeout middleware (30 seconds default)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      message: "The request took too long. Please try again.",
      statusCode: 408,
    });
  });
  next();
});

// Request ID middleware for tracing
app.use(requestIdMiddleware);

// Request logging for all /api/v1 calls (method, path, status, duration)
app.use(requestLoggingMiddleware);

// CORS middleware - uses CORS_ORIGIN from environment
// In production, this must be set to specific frontend origin(s)
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health check endpoint for container orchestration
app.get("/health", async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = "connected";

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      version: getVersion(),
    });
  } catch (error) {
    // Database connection failed
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      version: getVersion(),
    });
  }
});

// Swagger Documentation
if (!env.isProd) {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "IMS API Documentation",
    }),
  );
}

// API Routes
app.use("/api/v1", generalApiLimiter, router);

// Global error handler - must be last middleware
app.use(errorHandler);

export default app;
