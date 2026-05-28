-- AlterTable: add status to User
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable: SlackLog
CREATE TABLE "SlackLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "keyName" TEXT,
    "provider" TEXT,
    "message" TEXT NOT NULL,
    "success" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SlackLog_sentAt_idx" ON "SlackLog"("sentAt");
