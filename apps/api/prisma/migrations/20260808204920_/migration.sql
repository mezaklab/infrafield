/*
  Warnings:

  - The values [AGENDADA] on the enum `VisitStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `assetId` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `visits` table. All the data in the column will be lost.
  - Added the required column `address` to the `visits` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PeripheralCategory" AS ENUM ('COMPUTADOR', 'IMPRESSORA', 'SCANNER', 'MONITOR');

-- CreateEnum
CREATE TYPE "PeripheralSubcategory" AS ENUM ('DESKTOP', 'NOTEBOOK');

-- CreateEnum
CREATE TYPE "VisitAssetStatus" AS ENUM ('ESPERADO', 'ENCONTRADO', 'AUSENTE', 'NOVO');

-- CreateEnum
CREATE TYPE "ChecklistFieldType" AS ENUM ('YES_NO', 'TEXT', 'NUMBER', 'SELECT', 'PHOTO');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_ANALYSIS', 'IN_PROGRESS', 'RESOLVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- AlterEnum
BEGIN;
CREATE TYPE "VisitStatus_new" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');
ALTER TABLE "visits" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "visits" ALTER COLUMN "status" TYPE "VisitStatus_new" USING ("status"::text::"VisitStatus_new");
ALTER TYPE "VisitStatus" RENAME TO "VisitStatus_old";
ALTER TYPE "VisitStatus_new" RENAME TO "VisitStatus";
DROP TYPE "VisitStatus_old";
ALTER TABLE "visits" ALTER COLUMN "status" SET DEFAULT 'PLANEJADA';
COMMIT;

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_assetId_fkey";

-- AlterTable
ALTER TABLE "assets" DROP COLUMN "description",
DROP COLUMN "location",
ADD COLUMN     "assetTag" TEXT,
ADD COLUMN     "hostname" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "wifiBands" TEXT;

-- AlterTable
ALTER TABLE "visits" DROP COLUMN "assetId",
DROP COLUMN "location",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PLANEJADA',
ALTER COLUMN "type" SET DEFAULT 'INSPECAO';

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "room" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_assets" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "assetId" TEXT,
    "status" "VisitAssetStatus" NOT NULL DEFAULT 'ESPERADO',
    "notes" TEXT,
    "photoUrl" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Geral',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "ChecklistFieldType" NOT NULL DEFAULT 'YES_NO',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_responses" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "assetId" TEXT,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "protocol" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "recommendation" TEXT,
    "companyId" TEXT NOT NULL,
    "visitId" TEXT,
    "assetId" TEXT,
    "locationId" TEXT,
    "reportedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ALERT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "assetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peripherals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assetTag" TEXT,
    "serialNumber" TEXT,
    "category" "PeripheralCategory" NOT NULL DEFAULT 'COMPUTADOR',
    "subcategory" "PeripheralSubcategory",
    "brand" TEXT,
    "model" TEXT,
    "ipAddress" TEXT,
    "specifications" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "imageUrl" TEXT,
    "locationId" TEXT,
    "companyId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peripherals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peripherals_code_key" ON "peripherals"("code");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_assets" ADD CONSTRAINT "visit_assets_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_assets" ADD CONSTRAINT "visit_assets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peripherals" ADD CONSTRAINT "peripherals_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peripherals" ADD CONSTRAINT "peripherals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peripherals" ADD CONSTRAINT "peripherals_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
