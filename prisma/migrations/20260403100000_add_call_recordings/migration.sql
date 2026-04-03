-- CreateTable
CREATE TABLE "call_recordings" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "contact_id" TEXT,
    "call_sid" TEXT NOT NULL,
    "recording_sid" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "from_number" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "recording_url" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "sentiment" TEXT,
    "sentiment_score" DOUBLE PRECISION,
    "key_topics" JSONB,
    "objections" JSONB,
    "talk_listen_ratio" DOUBLE PRECISION,
    "action_items" JSONB,
    "analysis_status" TEXT NOT NULL DEFAULT 'pending',
    "analysis_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_recordings_call_sid_key" ON "call_recordings"("call_sid");
CREATE UNIQUE INDEX "call_recordings_recording_sid_key" ON "call_recordings"("recording_sid");
CREATE INDEX "call_recordings_user_id_created_at_idx" ON "call_recordings"("user_id", "created_at" DESC);
CREATE INDEX "call_recordings_contact_id_idx" ON "call_recordings"("contact_id");
CREATE INDEX "call_recordings_call_sid_idx" ON "call_recordings"("call_sid");

-- AddForeignKey
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
