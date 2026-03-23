-- AlterTable
ALTER TABLE "google_campaigns" ADD COLUMN     "advertising_channel_type" TEXT,
ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cost_micros" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "google_ad_groups" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "ad_group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT,
    "cpc_bid_micros" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost_micros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_ad_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_ads" (
    "id" TEXT NOT NULL,
    "ad_group_id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL,
    "headlines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "final_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost_micros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_keywords" (
    "id" TEXT NOT NULL,
    "ad_group_id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "match_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "is_negative" BOOLEAN NOT NULL DEFAULT false,
    "quality_score" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost_micros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_insights" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "ad_group_id" TEXT,
    "date" DATE NOT NULL,
    "level" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost_micros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "all_conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_cpc_micros" BIGINT NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "interaction_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "google_ad_groups_campaign_id_idx" ON "google_ad_groups"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_ad_groups_campaign_id_ad_group_id_key" ON "google_ad_groups"("campaign_id", "ad_group_id");

-- CreateIndex
CREATE INDEX "google_ads_ad_group_id_idx" ON "google_ads"("ad_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_ads_ad_group_id_ad_id_key" ON "google_ads"("ad_group_id", "ad_id");

-- CreateIndex
CREATE INDEX "google_keywords_ad_group_id_idx" ON "google_keywords"("ad_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_keywords_ad_group_id_criterion_id_key" ON "google_keywords"("ad_group_id", "criterion_id");

-- CreateIndex
CREATE INDEX "google_insights_account_id_idx" ON "google_insights"("account_id");

-- CreateIndex
CREATE INDEX "google_insights_campaign_id_idx" ON "google_insights"("campaign_id");

-- CreateIndex
CREATE INDEX "google_insights_date_idx" ON "google_insights"("date");

-- CreateIndex
CREATE UNIQUE INDEX "google_insights_account_id_campaign_id_ad_group_id_date_lev_key" ON "google_insights"("account_id", "campaign_id", "ad_group_id", "date", "level");

-- AddForeignKey
ALTER TABLE "google_ad_groups" ADD CONSTRAINT "google_ad_groups_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "google_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_ads" ADD CONSTRAINT "google_ads_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "google_ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_keywords" ADD CONSTRAINT "google_keywords_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "google_ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_insights" ADD CONSTRAINT "google_insights_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "google_ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_insights" ADD CONSTRAINT "google_insights_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "google_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_insights" ADD CONSTRAINT "google_insights_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "google_ad_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

