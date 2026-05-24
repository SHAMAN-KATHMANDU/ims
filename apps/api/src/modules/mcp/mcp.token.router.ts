/**
 * /mcp/token — trades the caller's JWT for a long-lived MCP-scoped token.
 *
 * Mounted under the global verifyToken→resolveTenant chain, so req.user is
 * already validated. Returns { token, expiresIn } that the client stores
 * and sends as Authorization: Bearer <token> against /mcp.
 */

import { Router, Request, Response } from "express";
import { signMcpToken } from "./mcp.token";

const mcpTokenRouter = Router();

mcpTokenRouter.post("/", (req: Request, res: Response) => {
  if (!req.user?.tenantId || !req.user.tenantSlug) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const { token, expiresIn } = signMcpToken({
    id: req.user.id,
    role: req.user.role,
    tenantId: req.user.tenantId,
    tenantSlug: req.user.tenantSlug,
    username: req.user.username,
  });

  res.json({
    token,
    expiresIn,
    tokenType: "Bearer",
    audience: "ims-mcp",
    mcpUrl: "/api/v1/mcp",
  });
});

export default mcpTokenRouter;
