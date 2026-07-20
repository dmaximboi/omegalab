-- Order buyer snapshot fields (fix shared-email identity mixups)
-- Run against production DB if Prisma migrate is not used on deploy.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerAddress" TEXT;

CREATE INDEX IF NOT EXISTS "Order_customerEmail_createdAt_idx" ON "Order"("customerEmail", "createdAt");
