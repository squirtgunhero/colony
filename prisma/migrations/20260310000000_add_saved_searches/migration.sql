-- CreateTable
CREATE TABLE "saved_searches" (
    "id"             TEXT NOT NULL,
    "user_id"        UUID NOT NULL,
    "contact_id"     TEXT,
    "name"           TEXT,
    "price_min"      DOUBLE PRECISION,
    "price_max"      DOUBLE PRECISION,
    "beds_min"       INTEGER,
    "baths_min"      DOUBLE PRECISION,
    "property_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "neighborhoods"  TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cities"         TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zip_codes"      TEXT[] DEFAULT ARRAY[]::TEXT[],
    "must_haves"     TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active"      BOOLEAN NOT NULL DEFAULT true,
    "notes"          TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_searches_user_id_is_active_idx" ON "saved_searches"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "saved_searches_contact_id_idx" ON "saved_searches"("contact_id");

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
