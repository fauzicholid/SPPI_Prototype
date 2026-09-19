-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROJECT_MANAGER', 'PMO_PORTFOLIO', 'RESEARCHER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ASSESSOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InputMode" AS ENUM ('QUICK', 'PRECISE');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('MANAGERIAL', 'AGILITY', 'SPATIAL_GOVERNANCE');

-- CreateEnum
CREATE TYPE "IndicatorCode" AS ENUM ('SPI', 'CPI', 'SC', 'VS', 'CR', 'FIR', 'ACC', 'XAI', 'PDP', 'OGC');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClassificationBand" AS ENUM ('VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "dimensionWeights" JSONB NOT NULL,
    "indicatorWeights" JSONB NOT NULL,
    "pdpSubItemWeights" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "weightConfigId" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "cycleLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "indicatorCode" "IndicatorCode" NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "inputMode" "InputMode" NOT NULL,
    "rubricLevel" INTEGER,
    "rawValues" JSONB,
    "normalizedValue" DOUBLE PRECISION NOT NULL,
    "justificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndicatorScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubItemScore" (
    "id" TEXT NOT NULL,
    "indicatorScoreId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SubItemScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SPPIResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "weightConfigId" TEXT NOT NULL,
    "dScoreM" DOUBLE PRECISION NOT NULL,
    "dScoreK" DOUBLE PRECISION NOT NULL,
    "dScoreS" DOUBLE PRECISION NOT NULL,
    "sppiScore" DOUBLE PRECISION NOT NULL,
    "classificationBand" "ClassificationBand" NOT NULL,
    "weakestIndicator" "IndicatorCode" NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "sensitivityLow" DOUBLE PRECISION,
    "sensitivityHigh" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SPPIResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_userId_key" ON "ProjectAssignment"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorScore_assessmentId_indicatorCode_key" ON "IndicatorScore"("assessmentId", "indicatorCode");

-- CreateIndex
CREATE UNIQUE INDEX "SubItemScore_indicatorScoreId_itemCode_key" ON "SubItemScore"("indicatorScoreId", "itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "SPPIResult_assessmentId_key" ON "SPPIResult"("assessmentId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightConfig" ADD CONSTRAINT "WeightConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_weightConfigId_fkey" FOREIGN KEY ("weightConfigId") REFERENCES "WeightConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorScore" ADD CONSTRAINT "IndicatorScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubItemScore" ADD CONSTRAINT "SubItemScore_indicatorScoreId_fkey" FOREIGN KEY ("indicatorScoreId") REFERENCES "IndicatorScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SPPIResult" ADD CONSTRAINT "SPPIResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SPPIResult" ADD CONSTRAINT "SPPIResult_weightConfigId_fkey" FOREIGN KEY ("weightConfigId") REFERENCES "WeightConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
