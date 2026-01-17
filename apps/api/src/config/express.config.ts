import express from "express";
import cors from "cors";
import router from "@/config/router.config";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger.config";

const app = express();

// CORS middleware
app.use(
  cors({
    origin: "*",
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for container orchestration
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "IMS API Documentation",
  }),
);

// API Routes
app.use("/api/v1", router);

export default app;
