-- Add missing foreign key indexes for query performance
-- These indexes prevent full table scans on JOIN and WHERE clauses

-- Activity indexes
CREATE INDEX IF NOT EXISTS "Activity_user_id_idx" ON "Activity"("user_id");
CREATE INDEX IF NOT EXISTS "Activity_user_id_createdAt_idx" ON "Activity"("user_id", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Activity_contactId_idx" ON "Activity"("contactId");
CREATE INDEX IF NOT EXISTS "Activity_dealId_idx" ON "Activity"("dealId");
CREATE INDEX IF NOT EXISTS "Activity_propertyId_idx" ON "Activity"("propertyId");

-- Document indexes
CREATE INDEX IF NOT EXISTS "Document_user_id_idx" ON "Document"("user_id");
CREATE INDEX IF NOT EXISTS "Document_propertyId_idx" ON "Document"("propertyId");
CREATE INDEX IF NOT EXISTS "Document_dealId_idx" ON "Document"("dealId");

-- Property indexes
CREATE INDEX IF NOT EXISTS "Property_user_id_idx" ON "Property"("user_id");
CREATE INDEX IF NOT EXISTS "Property_ownerId_idx" ON "Property"("ownerId");

-- Deal indexes
CREATE INDEX IF NOT EXISTS "Deal_user_id_idx" ON "Deal"("user_id");
CREATE INDEX IF NOT EXISTS "Deal_contactId_idx" ON "Deal"("contactId");
CREATE INDEX IF NOT EXISTS "Deal_propertyId_idx" ON "Deal"("propertyId");

-- Task indexes
CREATE INDEX IF NOT EXISTS "Task_user_id_idx" ON "Task"("user_id");
CREATE INDEX IF NOT EXISTS "Task_contactId_idx" ON "Task"("contactId");
CREATE INDEX IF NOT EXISTS "Task_propertyId_idx" ON "Task"("propertyId");
CREATE INDEX IF NOT EXISTS "Task_dealId_idx" ON "Task"("dealId");
