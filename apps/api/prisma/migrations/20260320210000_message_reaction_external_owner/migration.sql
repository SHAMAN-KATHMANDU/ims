-- AlterTable
ALTER TABLE "message_reactions" ADD COLUMN     "external_participant_id" VARCHAR(255),
ADD COLUMN     "reaction_owner_key" VARCHAR(200);

-- Backfill owner key for existing tenant-user reactions
UPDATE "message_reactions" SET "reaction_owner_key" = 'u:' || "user_id";

ALTER TABLE "message_reactions" ALTER COLUMN "reaction_owner_key" SET NOT NULL;

-- Drop old unique constraint
DROP INDEX "message_reactions_message_id_user_id_emoji_key";

-- Allow null user_id for external reactions
ALTER TABLE "message_reactions" ALTER COLUMN "user_id" DROP NOT NULL;

-- New unique constraint (one reaction per message + emoji + reactor)
CREATE UNIQUE INDEX "message_reactions_message_id_emoji_reaction_owner_key_key" ON "message_reactions"("message_id", "emoji", "reaction_owner_key");
