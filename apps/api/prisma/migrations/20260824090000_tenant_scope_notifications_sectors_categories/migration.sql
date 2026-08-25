ALTER TABLE "notifications" ADD COLUMN "companyId" TEXT;
ALTER TABLE "sectors" ADD COLUMN "companyId" TEXT;
ALTER TABLE "categories" ADD COLUMN "companyId" TEXT;

DO $$
DECLARE
  fallback_company_id TEXT;
BEGIN
  SELECT "id" INTO fallback_company_id FROM "companies" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1;

  IF fallback_company_id IS NULL AND EXISTS (SELECT 1 FROM "notifications") THEN
    RAISE EXCEPTION 'Cannot backfill notifications.companyId because companies table is empty';
  END IF;
  IF fallback_company_id IS NULL AND EXISTS (SELECT 1 FROM "sectors") THEN
    RAISE EXCEPTION 'Cannot backfill sectors.companyId because companies table is empty';
  END IF;
  IF fallback_company_id IS NULL AND EXISTS (SELECT 1 FROM "categories") THEN
    RAISE EXCEPTION 'Cannot backfill categories.companyId because companies table is empty';
  END IF;

  UPDATE "notifications" n
  SET "companyId" = COALESCE(a."companyId", fallback_company_id)
  FROM "assets" a
  WHERE n."assetId" = a."id";

  UPDATE "notifications"
  SET "companyId" = fallback_company_id
  WHERE "companyId" IS NULL;

  CREATE TEMP TABLE "_sector_company_map" (
    "sectorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetSectorId" TEXT NOT NULL,
    PRIMARY KEY ("sectorId", "companyId")
  ) ON COMMIT DROP;

  INSERT INTO "_sector_company_map" ("sectorId", "companyId", "targetSectorId")
  SELECT
    ranked."sector_id",
    ranked."companyId",
    CASE WHEN ranked.rn = 1 THEN ranked."sector_id" ELSE concat(
      substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 8), '-',
      substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 4), '-',
      '4', substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 3), '-',
      substr('89ab', (floor(random() * 4)::INT + 1), 1), substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 3), '-',
      substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 12)
    ) END
  FROM (
    SELECT
      t."sector_id",
      t."companyId",
      ROW_NUMBER() OVER (PARTITION BY t."sector_id" ORDER BY t."companyId") AS rn
    FROM "tickets" t
    WHERE t."sector_id" IS NOT NULL
    GROUP BY t."sector_id", t."companyId"
  ) ranked;

  INSERT INTO "sectors" ("id", "name", "companyId", "createdAt", "updatedAt")
  SELECT m."targetSectorId", s."name", m."companyId", s."createdAt", s."updatedAt"
  FROM "_sector_company_map" m
  JOIN "sectors" s ON s."id" = m."sectorId"
  WHERE m."targetSectorId" <> m."sectorId";

  UPDATE "tickets" t
  SET "sector_id" = m."targetSectorId"
  FROM "_sector_company_map" m
  WHERE t."sector_id" = m."sectorId"
    AND t."companyId" = m."companyId";

  UPDATE "sectors" s
  SET "companyId" = m."companyId"
  FROM "_sector_company_map" m
  WHERE s."id" = m."targetSectorId";

  UPDATE "sectors"
  SET "companyId" = fallback_company_id
  WHERE "companyId" IS NULL;

  CREATE TEMP TABLE "_category_company_map" (
    "categoryId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetCategoryId" TEXT NOT NULL,
    PRIMARY KEY ("categoryId", "companyId")
  ) ON COMMIT DROP;

  INSERT INTO "_category_company_map" ("categoryId", "companyId", "targetCategoryId")
  SELECT
    ranked."categoryId",
    ranked."companyId",
    CASE WHEN ranked.rn = 1 THEN ranked."categoryId" ELSE concat(
      substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 8), '-',
      substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 4), '-',
      '4', substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 3), '-',
      substr('89ab', (floor(random() * 4)::INT + 1), 1), substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 3), '-',
      substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 12)
    ) END
  FROM (
    SELECT
      t."categoryId",
      t."companyId",
      ROW_NUMBER() OVER (PARTITION BY t."categoryId" ORDER BY t."companyId") AS rn
    FROM "tickets" t
    WHERE t."categoryId" IS NOT NULL
    GROUP BY t."categoryId", t."companyId"
  ) ranked;

  INSERT INTO "categories" ("id", "name", "companyId", "createdAt", "updatedAt")
  SELECT m."targetCategoryId", c."name", m."companyId", c."createdAt", c."updatedAt"
  FROM "_category_company_map" m
  JOIN "categories" c ON c."id" = m."categoryId"
  WHERE m."targetCategoryId" <> m."categoryId";

  UPDATE "tickets" t
  SET "categoryId" = m."targetCategoryId"
  FROM "_category_company_map" m
  WHERE t."categoryId" = m."categoryId"
    AND t."companyId" = m."companyId";

  UPDATE "categories" c
  SET "companyId" = m."companyId"
  FROM "_category_company_map" m
  WHERE c."id" = m."targetCategoryId";

  UPDATE "categories"
  SET "companyId" = fallback_company_id
  WHERE "companyId" IS NULL;
END $$;

ALTER TABLE "notifications" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "sectors" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");
CREATE INDEX "sectors_companyId_idx" ON "sectors"("companyId");
CREATE INDEX "categories_companyId_idx" ON "categories"("companyId");
