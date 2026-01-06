-- AlterTable
ALTER TABLE "Report" ADD COLUMN "reportedMessageId" UUID;

-- CreateIndex
CREATE INDEX "Report_reportedMessageId_idx" ON "Report"("reportedMessageId");
