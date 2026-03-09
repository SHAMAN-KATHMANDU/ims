/**
 * Unit tests for controllerError utilities.
 * Verifies mapPrismaError and sendControllerError behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { mapPrismaError, sendControllerError } from "./controllerError";

vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("mapPrismaError", () => {
  it("returns 404 for P2025 (record not found)", () => {
    const result = mapPrismaError({ code: "P2025" });
    expect(result).toEqual({
      message: "The requested resource was not found.",
      statusCode: 404,
    });
  });

  it("returns 409 for P2002 (unique constraint violation)", () => {
    const result = mapPrismaError({ code: "P2002" });
    expect(result).toEqual({
      message: "A record with this value already exists.",
      statusCode: 409,
    });
  });

  it("returns 400 for P2003 (foreign key constraint)", () => {
    const result = mapPrismaError({ code: "P2003" });
    expect(result).toEqual({
      message:
        "Invalid reference. One of the linked records (contact, member, deal, or assigned user) was not found or is not valid.",
      statusCode: 400,
    });
  });

  it("returns null for unknown error codes", () => {
    expect(mapPrismaError({ code: "P9999" })).toBeNull();
    expect(mapPrismaError({ code: "UNKNOWN" })).toBeNull();
    expect(mapPrismaError({})).toBeNull();
    expect(mapPrismaError(null)).toBeNull();
    expect(mapPrismaError(undefined)).toBeNull();
  });
});

describe("sendControllerError", () => {
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockJson: ReturnType<typeof vi.fn>;

  function mockRes(): Response {
    mockStatus = vi.fn().mockReturnThis();
    mockJson = vi.fn().mockReturnThis();
    return { status: mockStatus, json: mockJson } as unknown as Response;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends 404 when error is P2025", () => {
    const req = {} as Request;
    const res = mockRes() as Response;

    sendControllerError(req, res, { code: "P2025" }, "getProduct");

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      message: "The requested resource was not found.",
    });
  });

  it("sends 409 when error is P2002", () => {
    const req = {} as Request;
    const res = mockRes() as Response;

    sendControllerError(req, res, { code: "P2002" }, "createProduct");

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith({
      message: "A record with this value already exists.",
    });
  });

  it("sends 400 when error is P2003", () => {
    const req = {} as Request;
    const res = mockRes() as Response;

    sendControllerError(req, res, { code: "P2003" }, "createSale");

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      message:
        "Invalid reference. One of the linked records (contact, member, deal, or assigned user) was not found or is not valid.",
    });
  });

  it("sends 500 with generic message for unknown errors", () => {
    const req = {} as Request;
    const res = mockRes() as Response;

    sendControllerError(
      req,
      res,
      new Error("DB connection lost"),
      "createProduct",
    );

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: "Something went wrong. Please try again.",
    });
  });

  it("never leaks error.message or stack in response", () => {
    const req = {} as Request;
    const res = mockRes() as Response;

    sendControllerError(
      req,
      res,
      new Error("Sensitive internal error"),
      "test",
    );

    const jsonCall = mockJson.mock.calls[0][0];
    expect(jsonCall.message).toBe("Something went wrong. Please try again.");
    expect(jsonCall).not.toHaveProperty("stack");
    expect(jsonCall).not.toContain("Sensitive");
  });
});
