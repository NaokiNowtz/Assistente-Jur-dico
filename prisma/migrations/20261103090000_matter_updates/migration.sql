-- CreateTable
CREATE TABLE "MatterUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'lawyer',
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatterUpdate_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MatterUpdate_matterId_occurredAt_idx" ON "MatterUpdate"("matterId", "occurredAt");
