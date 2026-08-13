ALTER TABLE "peripherals"
  ADD COLUMN "mac_address" TEXT,
  ADD COLUMN "current_ip" TEXT,
  ADD COLUMN "monitoring_status" "DeviceMonitoringStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "last_seen_at" TIMESTAMP(3),
  ADD COLUMN "last_checked_at" TIMESTAMP(3),
  ADD COLUMN "latency_ms" DOUBLE PRECISION,
  ADD COLUMN "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "monitoring_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "peripherals_mac_address_key" ON "peripherals"("mac_address");

CREATE TABLE "peripheral_ip_history" (
  "id" TEXT NOT NULL,
  "peripheral_id" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lost_at" TIMESTAMP(3),
  CONSTRAINT "peripheral_ip_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "peripheral_ip_history_peripheral_id_detected_at_idx"
  ON "peripheral_ip_history"("peripheral_id", "detected_at");

ALTER TABLE "peripheral_ip_history" ADD CONSTRAINT "peripheral_ip_history_peripheral_id_fkey"
  FOREIGN KEY ("peripheral_id") REFERENCES "peripherals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
