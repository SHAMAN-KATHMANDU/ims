import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import router from "@/config/router.config";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger.config";
import { env } from "@/config/env";
import { errorHandler } from "@/middlewares/errorHandler";
import { requestIdMiddleware } from "@/middlewares/requestId";
import { requestLoggingMiddleware } from "@/middlewares/requestLogging";
import { basePrisma as prisma } from "@/config/prisma";
import { getVersion } from "@/config/version";
import {
  oauthServerProvider,
  MCP_RESOURCE_URL,
  MCP_SCOPE,
} from "@/modules/oauth/oauth.provider";

const app = express();

// The API always sits behind exactly one reverse proxy in staging/production
// (Caddy on the dev box, nginx on prod) — trust that single hop so req.ip is
// the real client address. Without this, every external caller shares the
// proxy's IP and the OAuth /token + /register rate limits become one global
// bucket (and express-rate-limit logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on
// every request). Numeric 1 (not `true`) keeps X-Forwarded-For spoofing by
// direct clients ineffective beyond the first untrusted hop.
app.set("trust proxy", 1);

// Request timeout middleware (30 seconds default). The MCP transport streams
// tool responses and a single tool call can legitimately run long — give it
// 5 minutes instead (nginx mirrors this with proxy_read_timeout 300s).
app.use((req, res, next) => {
  const timeoutMs = req.path.startsWith("/api/v1/mcp") ? 300000 : 30000;
  req.setTimeout(timeoutMs, () => {
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

// MCP + OAuth endpoints are Bearer/PKCE-authed (no cookies), and MCP clients
// connect from arbitrary origins (claude.ai, MCP Inspector, ChatGPT) — so
// these paths get open CORS. Mounted BEFORE the credentialed app-wide CORS,
// which would otherwise end preflights from unknown origins with no
// Access-Control-Allow-Origin header.
app.use(
  [
    "/api/v1/mcp",
    "/authorize",
    "/token",
    "/register",
    "/revoke",
    "/.well-known",
  ],
  cors({
    origin: true,
    exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "mcp-protocol-version",
      "Mcp-Session-Id",
    ],
  }),
);

// CORS middleware - uses CORS_ORIGIN from environment
// In production, this must be set to specific frontend origin(s)
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

// OAuth 2.1 authorization server for the MCP transport (MCP SDK). Serves
// /.well-known/oauth-authorization-server, /.well-known/oauth-protected-resource/api/v1/mcp,
// /authorize, /token, /register (DCR) and /revoke — all at the app root, as
// RFC 8414/9728 require. Storage + policy live in modules/oauth/oauth.provider.
app.use(
  mcpAuthRouter({
    provider: oauthServerProvider,
    issuerUrl: new URL(env.oauthIssuerUrl),
    resourceServerUrl: new URL(MCP_RESOURCE_URL),
    scopesSupported: [MCP_SCOPE],
    resourceName: "IMS MCP",
    // DCR clients (claude.ai, ChatGPT) don't re-register when a secret
    // expires — issue non-expiring secrets and rely on /revoke + row revocation.
    clientRegistrationOptions: { clientSecretExpirySeconds: 0 },
  }),
);

// Webhook routes need raw body for HMAC signature verification — must come before express.json()
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  } catch {
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

// Public static files (e.g. messaging media under uploads/messaging/)
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    fallthrough: false,
    index: false,
  }),
);

// API Routes
app.use("/api/v1", router);

// Global error handler - must be last middleware
app.use(errorHandler);

export default app;
