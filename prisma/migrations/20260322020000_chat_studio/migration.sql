-- AlterTable
ALTER TABLE "honeycomb_chat_bots" ADD COLUMN     "auto_greet" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "auto_greet_delay" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "brand_color" TEXT DEFAULT '#f59e0b',
ADD COLUMN     "collect_lead_after" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "embed_token" TEXT NOT NULL,
ADD COLUMN     "notify_on_lead" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "position" TEXT DEFAULT 'bottom-right',
ADD COLUMN     "qualification_flow" JSONB DEFAULT '[]';
-- CreateTable
CREATE TABLE "chatbot_conversations" (
    "id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "visitor_name" TEXT,
    "visitor_email" TEXT,
    "visitor_phone" TEXT,
    "qualification_data" JSONB DEFAULT '{}',
    "qualification_complete" BOOLEAN NOT NULL DEFAULT false,
    "contact_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "page_url" TEXT,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),
    CONSTRAINT "chatbot_conversations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "chatbot_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "question_id" TEXT,
    "field_mapping" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chatbot_messages_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "chatbot_conversations_bot_id_status_idx" ON "chatbot_conversations"("bot_id", "status");
-- CreateIndex
CREATE INDEX "chatbot_conversations_bot_id_created_at_idx" ON "chatbot_conversations"("bot_id", "created_at" DESC);
-- CreateIndex
CREATE INDEX "chatbot_conversations_visitor_id_idx" ON "chatbot_conversations"("visitor_id");
-- CreateIndex
CREATE INDEX "chatbot_messages_conversation_id_created_at_idx" ON "chatbot_messages"("conversation_id", "created_at");
-- CreateIndex
CREATE UNIQUE INDEX "honeycomb_chat_bots_embed_token_key" ON "honeycomb_chat_bots"("embed_token");
-- CreateIndex
CREATE INDEX "honeycomb_chat_bots_embed_token_idx" ON "honeycomb_chat_bots"("embed_token");
-- AddForeignKey
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "honeycomb_chat_bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chatbot_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
