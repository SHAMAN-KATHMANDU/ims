/**
 * MCP HTTP transport mounted under the tenant-scoped chain. Verified JWT,
 * resolved tenant, and tenant AsyncLocalStorage context are already active
 * by the time the handler runs — the per-request McpServer/transport pair
 * inherits all of that.
 *
 * Stateless mode: no session ids. Each POST is independent.
 */

import { Router, Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp.server";
import { mcpAuthMiddleware } from "./mcp.middleware";
import { logger } from "@/config/logger";

const mcpRouter = Router();

mcpRouter.use(mcpAuthMiddleware);

async function handleMcpRequest(req: Request, res: Response) {
  try {
    if (!req.user?.tenantId || !req.user?.tenantSlug || !req.user?.id) {
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Missing auth context" },
        id: null,
      });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => undefined);
    });

    const server = createMcpServer({
      tenantId: req.user.tenantId,
      tenantSlug: req.user.tenantSlug,
      userId: req.user.id,
      userRole: req.user.role,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error("MCP request handling failed", undefined, { err });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal MCP server error" },
        id: null,
      });
    }
  }
}

mcpRouter.post("/", handleMcpRequest);
mcpRouter.get("/", handleMcpRequest);
mcpRouter.delete("/", handleMcpRequest);

export default mcpRouter;
