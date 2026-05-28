-- CreateTable NotificationLog
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "keyName" TEXT,
    "provider" TEXT,
    "message" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");

-- CreateTable Backup
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Backup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");
