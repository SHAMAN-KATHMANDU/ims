import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { UpdateAiSettingsSchema } from "./ai-settings.schema";
import aiSettingsService, { AiSettingsService } from "./ai-settings.service";

class AiSettingsController {
  constructor(private service: AiSettingsService) {}

  getAiSettings = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const settings = await this.service.get(tenantId);
      return res.status(200).json({
        message: "AI settings fetched successfully",
        settings,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get AI settings error");
    }
  };

  updateAiSettings = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateAiSettingsSchema.parse(req.body);
      const settings = await this.service.update(
        tenantId,
        body.systemPrompt ?? null,
      );
      return res.status(200).json({
        message: "AI settings updated successfully",
        settings,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Update AI settings error");
    }
  };
}

export default new AiSettingsController(aiSettingsService);
