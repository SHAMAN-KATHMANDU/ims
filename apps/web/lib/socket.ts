import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

/**
 * Base origin for Socket.IO (no /api/v1 suffix). Must match the API process that
 * runs Socket.IO — see apps/api/src/config/socket.config.ts (`path: "/ws"`).
 *
 * When `NEXT_PUBLIC_API_URL` is unset, dev uses the same host as next.config.js
 * rewrites for `/api/v1` (HTTP rewrites do not apply to WebSockets).
 */
function getSocketOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  if (raw !== "") {
    return raw.replace(/\/api\/v\d+\/?$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4000";
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

let socket: Socket | null = null;
let refCount = 0;
/** Defers teardown so React Strict Mode (mount → unmount → remount) does not disconnect mid-handshake. */
let pendingDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

const DISCONNECT_DEBOUNCE_MS = 300;

function createSocket(): Socket {
  const origin = getSocketOrigin() || window.location.origin;
  console.log("[Socket] Creating connection to:", origin);

  const s = io(origin, {
    // Must match server `path` in apps/api/src/config/socket.config.ts (no trailing slash)
    path: "/ws",
    auth: (cb) => {
      const state = useAuthStore.getState();
      cb({ token: state.token });
    },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    transports: ["websocket", "polling"],
  });

  s.on("connect", () => {
    console.log("[Socket] Connected, id:", s.id);
  });

  s.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  s.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  return s;
}

export function acquireSocket(): Socket {
  if (pendingDisconnectTimer !== null) {
    clearTimeout(pendingDisconnectTimer);
    pendingDisconnectTimer = null;
  }
  if (!socket) {
    socket = createSocket();
  }
  refCount++;
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function releaseSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) {
    return;
  }
  if (!socket) {
    return;
  }
  if (pendingDisconnectTimer !== null) {
    clearTimeout(pendingDisconnectTimer);
  }
  pendingDisconnectTimer = setTimeout(() => {
    pendingDisconnectTimer = null;
    if (refCount > 0 || !socket) {
      return;
    }
    socket.disconnect();
    socket = null;
  }, DISCONNECT_DEBOUNCE_MS);
}
