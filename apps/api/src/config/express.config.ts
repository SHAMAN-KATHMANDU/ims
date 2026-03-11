import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import router from "@/config/router.config";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger.config";
import { env } from "@/config/env";
import { errorHandler } from "@/middlewares/errorHandler";
import { requestIdMiddleware } from "@/middlewares/requestId";
import { requestLoggingMiddleware } from "@/middlewares/requestLogging";
import { metricsMiddleware, getMetrics } from "@/middlewares/metricsMiddleware";
import { basePrisma as prisma } from "@/config/prisma";
import { getVersion } from "@/config/version";

const app = express();

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

// Prometheus metrics (request count, duration) - skips /health, /metrics
app.use(metricsMiddleware);

// CORS middleware - uses CORS_ORIGIN from environment
// In production, this must be set to specific frontend origin(s)
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics endpoint (unauthenticated, for scraping)
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  try {
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (err) {
    res.status(500).send("# Error collecting metrics");
  }
});

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

// Swagger Documentation — 3.x Outline theme (ostranme/swagger-ui-themes)
const themePath = path.join(
  path.dirname(require.resolve("swagger-ui-themes/package.json")),
  "themes",
  "3.x",
  "theme-outline.css",
);
const outlineThemeCss = fs.readFileSync(themePath, "utf-8");

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: outlineThemeCss,
    customSiteTitle: "IMS API Documentation",
    swaggerOptions: {
      displayRequestDuration: true,
      docExpansion: "none",
      filter: true,
    },
  }),
);

// API Routes
app.use("/api/v1", router);

// Global error handler - must be last middleware
app.use(errorHandler);

export default app;
