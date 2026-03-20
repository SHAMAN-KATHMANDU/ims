import { z } from "zod";

const mediaUrlSchema = z
  .string()
  .refine(
    (val) =>
      /^https?:\/\//i.test(val) || val.startsWith("/uploads/messaging/"),
    { message: "mediaUrl must be a valid URL or /uploads/messaging/ path" },
  );

export const SendMessageSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    mediaUrl: mediaUrlSchema.optional(),
    mediaType: z.enum(["image", "video", "audio", "file"]).optional(),
    replyToId: z.string().uuid().optional(),
  })
  .refine((data) => data.text || data.mediaUrl, {
    message: "Either text or mediaUrl is required",
  });

export const AddReactionSchema = z.object({
  emoji: z.string().trim().min(1, "Emoji is required").max(32),
});

export const EditMessageSchema = z.object({
  text: z.string().trim().min(1),
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
export type AddReactionDto = z.infer<typeof AddReactionSchema>;
export type EditMessageDto = z.infer<typeof EditMessageSchema>;
export type UpdateConversationDto = z.infer<typeof UpdateConversationSchema>;
export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;
export type MessageQuery = z.infer<typeof MessageQuerySchema>;
