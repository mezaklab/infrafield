ALTER TABLE "tickets" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "tickets_category_id_idx" ON "tickets"("categoryId");
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Safe legacy backfill: only exact category names are linked; unmatched history remains untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'tickets'
      AND column_name = 'category'
  ) THEN
    UPDATE "tickets" t
    SET "categoryId" = c."id"
    FROM "categories" c
    WHERE t."categoryId" IS NULL
      AND lower(trim(t."category")) = lower(trim(c."name"));
  END IF;
END $$;
