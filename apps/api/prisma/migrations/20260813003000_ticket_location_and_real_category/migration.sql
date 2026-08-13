-- Persist the category selected by the ticket author. Existing tickets remain
-- valid and are explicitly classified as historical "Outros" records.
ALTER TABLE "tickets" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Outros';

CREATE INDEX "tickets_location_id_idx" ON "tickets"("locationId");
