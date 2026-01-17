import express from "express";
import router from "@/config/router.config";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger.config";

const app = express();

// CORS middleware - must be before other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow all localhost origins for development
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ];

  // Set CORS headers for all requests
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV === "development") {
    // In development, allow any localhost origin
    if (origin && origin.includes("localhost")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

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
