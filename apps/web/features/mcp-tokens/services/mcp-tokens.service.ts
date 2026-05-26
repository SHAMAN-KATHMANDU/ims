import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { CreateMcpTokenData, IssuedMcpToken, McpToken } from "../types";

// Note: api.* response.data is the unwrapped payload from the {success,data}
// envelope (handled by the global axios interceptor in apps/web/lib/axios.ts).

export async function listMcpTokens(): Promise<McpToken[]> {
  try {
    const res = await api.get<{ tokens: McpToken[] }>("/mcp/tokens");
    return res.data.tokens ?? [];
  } catch (error) {
    handleApiError(error, "list MCP tokens");
  }
}

export async function createMcpToken(
  payload: CreateMcpTokenData,
): Promise<IssuedMcpToken> {
  if (!payload.name?.trim()) throw new Error("Name is required");
  try {
    const res = await api.post<IssuedMcpToken>("/mcp/tokens", payload);
    return res.data;
  } catch (error) {
    handleApiError(error, "create MCP token");
  }
}

export async function revokeMcpToken(id: string): Promise<void> {
  try {
    await api.delete(`/mcp/tokens/${id}`);
  } catch (error) {
    handleApiError(error, `revoke MCP token "${id}"`);
  }
}
