import { z } from "zod";

export const SendMessageSchema = z
  .object({
    text: z.string().min(1).max(2000).optional(),
    mediaUrl: z.string().url().optional(),
    mediaType: z.enum(["image", "video", "audio", "file"]).optional(),
  })
  .refine((data) => data.text || data.mediaUrl, {
    message: "Either text or mediaUrl is required",
  });

export const UpdateConversationSchema = z.object({
  assignedToId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]).optional(),
});

export const ConversationQuerySchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]).optional(),
  channelId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const MessageQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type UpdateConversationDto = z.infer<typeof UpdateConversationSchema>;
export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;
export type MessageQuery = z.infer<typeof MessageQuerySchema>;
