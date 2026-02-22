import { vi } from "vitest";

vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  default: {
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    setUser: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
  },
}));

vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      ping: vi.fn().mockResolvedValue("PONG"),
      disconnect: vi.fn(),
      quit: vi.fn(),
    })),
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));
