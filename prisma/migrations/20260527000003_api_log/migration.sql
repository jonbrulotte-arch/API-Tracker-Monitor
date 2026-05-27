-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "tokenPrefix" TEXT,
    "tokenName" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "keyName" TEXT,
    "ipAddress" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ApiLog_requestedAt_idx" ON "ApiLog"("requestedAt");
CREATE INDEX "ApiLog_tokenPrefix_idx" ON "ApiLog"("tokenPrefix");
