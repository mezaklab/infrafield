-- Additive migration: keeps the legacy ip_address-equivalent column ("ipAddress")
-- and copies it to current_ip for a non-destructive transition.
CREATE TYPE "DeviceMonitoringStatus" AS ENUM ('ONLINE', 'DEGRADED', 'UNKNOWN', 'OFFLINE');

ALTER TABLE "assets"
  ADD COLUMN "mac_address" TEXT,
  ADD COLUMN "current_ip" TEXT,
  ADD COLUMN "monitoring_status" "DeviceMonitoringStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "last_seen_at" TIMESTAMP(3),
  ADD COLUMN "last_checked_at" TIMESTAMP(3),
  ADD COLUMN "latency_ms" DOUBLE PRECISION,
  ADD COLUMN "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "monitoring_enabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "assets" SET "current_ip" = "ipAddress" WHERE "ipAddress" IS NOT NULL;

CREATE UNIQUE INDEX "assets_mac_address_key" ON "assets"("mac_address");

CREATE TABLE "device_ip_history" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lost_at" TIMESTAMP(3),
  CONSTRAINT "device_ip_history_pkey" PRIMARY KEY ("id")
);

INSERT INTO "device_ip_history" ("id", "device_id", "ip_address", "detected_at")
SELECT "id" || '-initial-ip', "id", "ipAddress", CURRENT_TIMESTAMP
FROM "assets"
WHERE "ipAddress" IS NOT NULL;

CREATE INDEX "device_ip_history_device_id_detected_at_idx"
  ON "device_ip_history"("device_id", "detected_at");
CREATE INDEX "device_ip_history_device_id_lost_at_idx"
  ON "device_ip_history"("device_id", "lost_at");

ALTER TABLE "device_ip_history"
  ADD CONSTRAINT "device_ip_history_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
