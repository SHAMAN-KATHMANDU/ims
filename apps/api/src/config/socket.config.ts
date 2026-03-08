import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import { logger } from "./logger";

let io: SocketServer | null = null;

/**
 * Initialises Socket.IO on the given HTTP server.
 *
 * - CORS is derived from the shared env config.
 * - A Redis adapter (pub/sub pair) is attached so the server scales horizontally.
 * - JWT auth middleware validates the token supplied via `socket.handshake.auth.token`.
 * - On connection each socket auto-joins its tenant and user rooms.
 */
export function setupSocketIO(httpServer: any): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
    path: "/ws",
  });

  // Redis adapter for horizontal scaling
  const pubClient = new IORedis(env.redisUrl);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    try {
      const decoded = jwt.verify(token, env.jwtSecret) as Record<string, any>;
      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Authentication error: invalid token"));
    }
  });

  // Connection handler - join tenant and user rooms
  io.on("connection", (socket) => {
    const { tenantId, id: userId } = socket.data.user ?? {};

    logger.log(
      `[Socket] Client connected: ${socket.id}, tenant: ${tenantId}, user: ${userId}`,
    );

    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", (reason) => {
      logger.log(
        `[Socket] Client disconnected: ${socket.id}, reason: ${reason}`,
      );
    });
  });

  return io;
}

/**
 * Returns the current Socket.IO server instance.
 * Will be null until `setupSocketIO` has been called.
 */
export function getIO(): SocketServer | null {
  return io;
}
