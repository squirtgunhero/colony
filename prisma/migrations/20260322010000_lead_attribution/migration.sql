-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "campaign_channel" TEXT,
ADD COLUMN     "campaign_id" TEXT,
ADD COLUMN     "campaign_name" TEXT,
ADD COLUMN     "landing_page" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_content" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT,
ADD COLUMN     "utm_term" TEXT;
-- CreateTable
CREATE TABLE "lead_attributions" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "campaign_name" TEXT,
    "campaign_id" TEXT,
    "ad_group_name" TEXT,
    "ad_name" TEXT,
    "keyword" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "landing_page" TEXT,
    "referrer" TEXT,
    "touch_type" TEXT NOT NULL DEFAULT 'first',
    "attributed_cost" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_attributions_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "lead_attributions_contact_id_idx" ON "lead_attributions"("contact_id");
-- CreateIndex
CREATE INDEX "lead_attributions_channel_idx" ON "lead_attributions"("channel");
-- CreateIndex
CREATE INDEX "lead_attributions_campaign_id_idx" ON "lead_attributions"("campaign_id");
-- CreateIndex
CREATE INDEX "lead_attributions_created_at_idx" ON "lead_attributions"("created_at");
-- CreateIndex
CREATE INDEX "Contact_campaign_channel_idx" ON "Contact"("campaign_channel");
-- CreateIndex
CREATE INDEX "Contact_source_idx" ON "Contact"("source");
-- AddForeignKey
ALTER TABLE "lead_attributions" ADD CONSTRAINT "lead_attributions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
