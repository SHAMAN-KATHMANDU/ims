import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Strip /api/v1 (or similar) to get the base origin for Socket.IO
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

let socket: Socket | null = null;
let refCount = 0;

function createSocket(): Socket {
  console.log(
    "[Socket] Creating connection to:",
    SOCKET_URL || window.location.origin,
  );

  const s = io(SOCKET_URL || window.location.origin, {
    path: "/ws/",
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
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
