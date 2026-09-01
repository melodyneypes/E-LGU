import prisma from "../lib/db/prisma";

async function main() {
    console.log("Creating RHU Medical Equipment & Stockroom tables safely...");

    // 1. Create Enums if they do not exist
    await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            CREATE TYPE "PropertyCategory" AS ENUM ('PPE', 'SEMI_EXPENDABLE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);

    await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            CREATE TYPE "AcquisitionSource" AS ENUM ('STOCKROOM_ISSUANCE', 'LEGACY_BHS_EXISTING', 'DIRECT_DONATION');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);

    await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            CREATE TYPE "MedicalAssetStatus" AS ENUM (
                'PO_DRAFTED',
                'IN_STOCKROOM',
                'RO_SUBMITTED',
                'SO_DISPATCHED',
                'STOCK_RETURN_DISCREPANCY',
                'PENDING_VERIFICATION',
                'DEPLOYED_SERVICEABLE',
                'DEFECTIVE_FOR_REPAIR',
                'UNSERVICEABLE_FOR_CONDEMNATION',
                'CONDEMNED_DISPOSED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);

    // 2. Create MedicalAsset table
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MedicalAsset" (
            "id" TEXT PRIMARY KEY,
            "assetTagNo" TEXT NOT NULL UNIQUE,
            "equipmentName" TEXT NOT NULL,
            "brand" TEXT,
            "serialNo" TEXT DEFAULT 'UNKNOWN/NONE',
            "category" "PropertyCategory" NOT NULL DEFAULT 'SEMI_EXPENDABLE',
            "acquisitionSource" "AcquisitionSource" NOT NULL DEFAULT 'STOCKROOM_ISSUANCE',
            "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "acquisitionDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
            "currentStatus" "MedicalAssetStatus" NOT NULL DEFAULT 'IN_STOCKROOM',
            "currentFacility" TEXT NOT NULL DEFAULT 'Main RHU',
            "assignedRoom" TEXT NOT NULL DEFAULT 'Central Stockroom',
            "accountablePerson" TEXT NOT NULL DEFAULT 'Unassigned',
            "accountableEmployeeId" TEXT,
            "documentReference" TEXT,
            "photoUrl" TEXT,
            "poReferenceNo" TEXT,
            "roReferenceNo" TEXT,
            "soReferenceNo" TEXT,
            "discrepancyNotes" TEXT,
            "defectDetails" TEXT,
            "lastRepairDate" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MedicalAsset_currentFacility_idx" ON "MedicalAsset"("currentFacility");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MedicalAsset_currentStatus_idx" ON "MedicalAsset"("currentStatus");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MedicalAsset_category_idx" ON "MedicalAsset"("category");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MedicalAsset_assetTagNo_idx" ON "MedicalAsset"("assetTagNo");`);

    // 3. Create EquipmentPurchaseOrder & EquipmentPOItem
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentPurchaseOrder" (
            "id" TEXT PRIMARY KEY,
            "poNumber" TEXT NOT NULL UNIQUE,
            "vendorName" TEXT NOT NULL,
            "vendorContact" TEXT,
            "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "createdById" TEXT,
            "createdByName" TEXT,
            "pdfUrl" TEXT,
            "notes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentPurchaseOrder_poNumber_idx" ON "EquipmentPurchaseOrder"("poNumber");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentPurchaseOrder_status_idx" ON "EquipmentPurchaseOrder"("status");`);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentPOItem" (
            "id" TEXT PRIMARY KEY,
            "poId" TEXT NOT NULL,
            "equipmentName" TEXT NOT NULL,
            "brand" TEXT,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "receivedQty" INTEGER NOT NULL DEFAULT 0,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            CONSTRAINT "EquipmentPOItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "EquipmentPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentPOItem_poId_idx" ON "EquipmentPOItem"("poId");`);

    // 4. Create EquipmentRequestOrder & EquipmentROItem
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentRequestOrder" (
            "id" TEXT PRIMARY KEY,
            "roNumber" TEXT NOT NULL UNIQUE,
            "requestingFacility" TEXT NOT NULL,
            "requestedRoom" TEXT NOT NULL,
            "requestedBy" TEXT NOT NULL,
            "requestedById" TEXT,
            "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
            "justification" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentRequestOrder_roNumber_idx" ON "EquipmentRequestOrder"("roNumber");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentRequestOrder_requestingFacility_idx" ON "EquipmentRequestOrder"("requestingFacility");`);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentROItem" (
            "id" TEXT PRIMARY KEY,
            "roId" TEXT NOT NULL,
            "equipmentName" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "estimatedUnitCost" DOUBLE PRECISION DEFAULT 0,
            "urgency" TEXT DEFAULT 'NORMAL',
            CONSTRAINT "EquipmentROItem_roId_fkey" FOREIGN KEY ("roId") REFERENCES "EquipmentRequestOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentROItem_roId_idx" ON "EquipmentROItem"("roId");`);

    // 5. Create EquipmentStockTransfer & EquipmentSOItem
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentStockTransfer" (
            "id" TEXT PRIMARY KEY,
            "soNumber" TEXT NOT NULL UNIQUE,
            "linkedRoNumber" TEXT,
            "targetFacility" TEXT NOT NULL,
            "targetRoom" TEXT NOT NULL,
            "dispatchedBy" TEXT NOT NULL,
            "dispatchedById" TEXT,
            "status" TEXT NOT NULL DEFAULT 'DISPATCHED',
            "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "receivedAt" TIMESTAMP(3),
            "receivedBy" TEXT,
            "documentType" TEXT,
            "documentReference" TEXT,
            "notes" TEXT
        );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentStockTransfer_soNumber_idx" ON "EquipmentStockTransfer"("soNumber");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentStockTransfer_targetFacility_idx" ON "EquipmentStockTransfer"("targetFacility");`);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentSOItem" (
            "id" TEXT PRIMARY KEY,
            "soId" TEXT NOT NULL,
            "assetId" TEXT,
            "equipmentName" TEXT NOT NULL,
            "brand" TEXT,
            "serialNo" TEXT,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "status" TEXT NOT NULL DEFAULT 'DISPATCHED',
            CONSTRAINT "EquipmentSOItem_soId_fkey" FOREIGN KEY ("soId") REFERENCES "EquipmentStockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentSOItem_soId_idx" ON "EquipmentSOItem"("soId");`);

    // 6. Create EquipmentStockReturnTicket
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EquipmentStockReturnTicket" (
            "id" TEXT PRIMARY KEY,
            "ticketNumber" TEXT NOT NULL UNIQUE,
            "soNumber" TEXT NOT NULL,
            "bhsFacility" TEXT NOT NULL,
            "returnedBy" TEXT NOT NULL,
            "missingQuantity" INTEGER NOT NULL DEFAULT 0,
            "defectiveQuantity" INTEGER NOT NULL DEFAULT 0,
            "reasonNotes" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'OPEN_INVESTIGATION',
            "resolutionNotes" TEXT,
            "resolvedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentStockReturnTicket_ticketNumber_idx" ON "EquipmentStockReturnTicket"("ticketNumber");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EquipmentStockReturnTicket_soNumber_idx" ON "EquipmentStockReturnTicket"("soNumber");`);

    console.log("All RHU Equipment tables created successfully!");
}

main()
    .catch(e => {
        console.error("Migration error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
