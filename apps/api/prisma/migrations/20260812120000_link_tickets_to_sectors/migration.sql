-- Gestão de Setores passa a ser a fonte relacional dos chamados.
-- locationId permanece para preservar chamados e integrações legadas.
ALTER TABLE "tickets" ADD COLUMN "sector_id" TEXT;

ALTER TABLE "tickets"
ADD CONSTRAINT "tickets_sector_id_fkey"
FOREIGN KEY ("sector_id") REFERENCES "sectors"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "tickets_sector_id_idx" ON "tickets"("sector_id");
