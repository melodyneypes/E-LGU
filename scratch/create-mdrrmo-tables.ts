import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Creating MDRRMO tables in PostgreSQL if not exist...");

    // 1. AmbulanceDriver table
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AmbulanceDriver" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "contactNumber" TEXT NOT NULL,
            "licenseNumber" TEXT NOT NULL,
            "licenseExpiry" TIMESTAMP(3),
            "status" TEXT NOT NULL DEFAULT 'STANDBY',
            "dutyShift" TEXT DEFAULT 'Day Shift (6:00 AM - 2:00 PM)',
            "emergencyContact" TEXT,
            "notes" TEXT,
            "photoUrl" TEXT,
            "assignedAmbulanceId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AmbulanceDriver_pkey" PRIMARY KEY ("id")
        );
    `);
    console.log("✅ AmbulanceDriver table verified/created.");

    // 2. AmbulanceDocument table
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AmbulanceDocument" (
            "id" TEXT NOT NULL,
            "ambulanceId" TEXT NOT NULL,
            "documentType" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "documentNumber" TEXT,
            "fileUrl" TEXT NOT NULL,
            "fileName" TEXT,
            "fileSize" TEXT,
            "fileType" TEXT,
            "issueDate" TIMESTAMP(3),
            "expiryDate" TIMESTAMP(3),
            "issuingAgency" TEXT,
            "status" TEXT NOT NULL DEFAULT 'VALID',
            "remarks" TEXT,
            "uploadedBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AmbulanceDocument_pkey" PRIMARY KEY ("id")
        );
    `);
    console.log("✅ AmbulanceDocument table verified/created.");

    // 3. AmbulanceDispatchSchedule table
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AmbulanceDispatchSchedule" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "dispatchType" TEXT NOT NULL DEFAULT 'EMERGENCY_TRANSFER',
            "priority" TEXT NOT NULL DEFAULT 'HIGH',
            "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
            "patientName" TEXT,
            "patientContact" TEXT,
            "pickupLocation" TEXT NOT NULL,
            "destination" TEXT NOT NULL,
            "scheduledDate" TIMESTAMP(3) NOT NULL,
            "departureTime" TEXT,
            "returnTime" TEXT,
            "ambulanceId" TEXT,
            "driverId" TEXT,
            "medicStaff" TEXT,
            "notes" TEXT,
            "destinationHospital" TEXT,
            "requestedBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AmbulanceDispatchSchedule_pkey" PRIMARY KEY ("id")
        );
    `);
    console.log("✅ AmbulanceDispatchSchedule table verified/created.");

    // 4. Foreign Key Constraints (Safe additive check)
    await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'AmbulanceDriver_assignedAmbulanceId_fkey'
            ) THEN
                ALTER TABLE "AmbulanceDriver" 
                ADD CONSTRAINT "AmbulanceDriver_assignedAmbulanceId_fkey" 
                FOREIGN KEY ("assignedAmbulanceId") REFERENCES "RHUAmbulance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'AmbulanceDocument_ambulanceId_fkey'
            ) THEN
                ALTER TABLE "AmbulanceDocument" 
                ADD CONSTRAINT "AmbulanceDocument_ambulanceId_fkey" 
                FOREIGN KEY ("ambulanceId") REFERENCES "RHUAmbulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'AmbulanceDispatchSchedule_ambulanceId_fkey'
            ) THEN
                ALTER TABLE "AmbulanceDispatchSchedule" 
                ADD CONSTRAINT "AmbulanceDispatchSchedule_ambulanceId_fkey" 
                FOREIGN KEY ("ambulanceId") REFERENCES "RHUAmbulance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'AmbulanceDispatchSchedule_driverId_fkey'
            ) THEN
                ALTER TABLE "AmbulanceDispatchSchedule" 
                ADD CONSTRAINT "AmbulanceDispatchSchedule_driverId_fkey" 
                FOREIGN KEY ("driverId") REFERENCES "AmbulanceDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
        END $$;
    `);
    console.log("✅ Foreign key constraints verified/created.");
}

main()
    .catch(e => {
        console.error("Error creating tables:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
