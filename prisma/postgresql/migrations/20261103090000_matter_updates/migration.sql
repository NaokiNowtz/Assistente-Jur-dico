-- CreateTable
CREATE TABLE "MatterUpdate" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'lawyer',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatterUpdate_matterId_occurredAt_idx" ON "MatterUpdate"("matterId", "occurredAt");

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
