-- CreateTable
CREATE TABLE "OccupancyPermit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "dateIssued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicantName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "occupancyUse" TEXT NOT NULL,
    "location" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "documentUrl" TEXT,
    "issuedBy" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,

    CONSTRAINT "OccupancyPermit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OccupancyPermit_transactionId_key" ON "OccupancyPermit"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "OccupancyPermit_permitNumber_key" ON "OccupancyPermit"("permitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OccupancyPermit_verificationId_key" ON "OccupancyPermit"("verificationId");

-- AddForeignKey
ALTER TABLE "OccupancyPermit" ADD CONSTRAINT "OccupancyPermit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
