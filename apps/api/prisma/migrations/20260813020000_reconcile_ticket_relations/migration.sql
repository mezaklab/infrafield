-- Reconciles installations whose migration history predates the relational ticket fields.
-- All operations are additive and preserve existing ticket data.
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Outros';
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "sector_id" TEXT;
CREATE INDEX IF NOT EXISTS "tickets_category_id_idx" ON "tickets"("categoryId");
CREATE INDEX IF NOT EXISTS "tickets_sector_id_idx" ON "tickets"("sector_id");

DO $reconcile$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_categoryId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_sector_id_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sector_id_fkey"
      FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $reconcile$;
