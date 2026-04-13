import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { mockRes, makeReq } from "@tests/helpers/controller";

vi.mock("./automation.service", () => ({
  default: {
    getDefinitions: vi.fn(),
    getDefinitionById: vi.fn(),
    createDefinition: vi.fn(),
    updateDefinition: vi.fn(),
    archiveDefinition: vi.fn(),
    getRuns: vi.fn(),
    replayEvent: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  env: Object.freeze({
    appEnv: "production",
    featureFlags: undefined,
  }),
}));

import automationController from "./automation.controller";
import automationService from "./automation.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = automationService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

describe("automation.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns automation definitions", async () => {
    mockService.getDefinitions.mockResolvedValue({
      automations: [{ id: "auto-1", name: "Restock" }],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    const req = makeReq({ query: { page: "1", limit: "10" } });
    const res = mockRes() as Response;

    await automationController.getDefinitions(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  it("returns 404 when flowGraph is set and AUTOMATION_BRANCHING is off", async () => {
    const req = makeReq({
      body: {
        name: "Graph auto",
        scopeType: "GLOBAL",
        triggers: [{ eventName: "inventory.stock.low_detected" }],
        flowGraph: { nodes: [], edges: [] },
        steps: [],
      },
    });
    const res = mockRes() as Response;

    await automationController.createDefinition(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockService.createDefinition).not.toHaveBeenCalled();
  });

  it("returns 404 on update with non-null flowGraph when AUTOMATION_BRANCHING is off", async () => {
    const req = makeReq({
      params: { id: "00000000-0000-0000-0000-000000000001" },
      body: { flowGraph: { nodes: [], edges: [] } },
    });
    const res = mockRes() as Response;

    await automationController.updateDefinition(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockService.updateDefinition).not.toHaveBeenCalled();
  });

  it("returns 201 on create success", async () => {
    mockService.createDefinition.mockResolvedValue({
      id: "auto-1",
      name: "Restock",
    });

    const req = makeReq({
      body: {
        name: "Restock",
        scopeType: "GLOBAL",
        triggers: [{ eventName: "inventory.stock.low_detected" }],
        steps: [
          {
            actionType: "workitem.create",
            actionConfig: {
              title: "Restock",
              type: "RESTOCK_REQUEST",
              priority: "HIGH",
            },
          },
        ],
      },
    });
    const res = mockRes() as Response;

    await automationController.createDefinition(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 400 for invalid automation id", async () => {
    const req = makeReq({ params: { id: "invalid" } });
    const res = mockRes() as Response;

    await automationController.getDefinitionById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockService.getDefinitionById).not.toHaveBeenCalled();
  });

  it("returns service status codes for known app errors", async () => {
    const err = new Error("Automation not found") as Error & {
      statusCode: number;
    };
    err.statusCode = 404;
    mockService.getDefinitionById.mockRejectedValue(err);

    const req = makeReq({
      params: { id: "00000000-0000-0000-0000-000000000001" },
    });
    const res = mockRes() as Response;

    await automationController.getDefinitionById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("calls sendControllerError on unexpected errors", async () => {
    mockService.getDefinitions.mockRejectedValue(new Error("DB down"));

    const req = makeReq();
    const res = mockRes() as Response;

    await automationController.getDefinitions(req, res);

    expect(sendControllerError).toHaveBeenCalled();
  });

  it("returns 202 when replaying an automation event", async () => {
    mockService.replayEvent.mockResolvedValue({ replayQueued: true });

    const req = makeReq({
      params: { id: "00000000-0000-0000-0000-000000000001" },
      body: { reprocessFromStart: true },
    });
    const res = mockRes() as Response;

    await automationController.replayEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(mockService.replayEvent).toHaveBeenCalledWith(
      "t1",
      "00000000-0000-0000-0000-000000000001",
      { reprocessFromStart: true },
    );
  });

  it("returns 400 for invalid replay event ids", async () => {
    const req = makeReq({
      params: { id: "invalid" },
      body: { reprocessFromStart: true },
    });
    const res = mockRes() as Response;

    await automationController.replayEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockService.replayEvent).not.toHaveBeenCalled();
  });

  it("returns replay service status codes for known app errors", async () => {
    const err = new Error(
      "Only failed or exhausted automation events can be replayed",
    ) as Error & {
      statusCode: number;
    };
    err.statusCode = 409;
    mockService.replayEvent.mockRejectedValue(err);

    const req = makeReq({
      params: { id: "00000000-0000-0000-0000-000000000001" },
      body: {},
    });
    const res = mockRes() as Response;

    await automationController.replayEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
