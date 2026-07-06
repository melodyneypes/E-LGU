import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting beautiful multi-window queue seeder...");

    // 1. Get an existing user to own these test transactions
    const user = await prisma.user.findFirst({
        include: {
            residentProfile: true
        }
    });

    if (!user) {
        console.error("❌ No users found in database! Please register a user first.");
        return;
    }

    console.log(`👤 Using user: ${user.email} (${user.residentProfile?.firstName || "No Name"})`);

    // 2. Fetch Transaction Types
    const cedulaType = await prisma.transactionType.findFirst({ where: { code: "CEDULA_IND" } });
    const bploType = await prisma.transactionType.findFirst({ where: { code: "BUSINESS_PERMIT_NEW" } });
    const registrarType = await prisma.transactionType.findFirst({ where: { code: "LCR_BIRTH" } });
    const engineeringType = await prisma.transactionType.findFirst({ where: { code: "BUILDING_PERMIT" } });

    if (!cedulaType || !bploType || !registrarType || !engineeringType) {
        console.error("❌ Missing transaction types in DB! Please seed transaction types first.");
        return;
    }

    // 3. Define Today's Date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Clean existing test transactions to avoid duplicates
    await prisma.transaction.deleteMany({
        where: {
            queueNumber: { contains: "-TEST-" }
        }
    });

    const testResidentSnapshot = {
        firstName: user.residentProfile?.firstName || "Test",
        lastName: user.residentProfile?.lastName || "Applicant",
        middleName: user.residentProfile?.middleName || "",
        suffix: user.residentProfile?.suffix || "",
        gender: user.residentProfile?.gender || "Male",
        dateOfBirth: user.residentProfile?.dateOfBirth || new Date("1995-01-01"),
        civilStatus: user.residentProfile?.civilStatus || "Single",
        citizenship: user.residentProfile?.citizenship || "Filipino",
        barangay: user.residentProfile?.barangay || "Poblacion",
        municipality: "Mapandan",
        province: "Pangasinan"
    };

    console.log("📝 Seeding Treasury (Cedula) Queue (3 Counters)...");
    // Treasury Counter 1 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: cedulaType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "Treasury Counter 1" },
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-001",
            isPriority: false
        }
    });
    // Treasury Counter 2 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: cedulaType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "Treasury Counter 2" },
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-002",
            isPriority: true
        }
    });
    // Treasury Counter 3 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: cedulaType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "Treasury Counter 3" },
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-003",
            isPriority: false
        }
    });
    // Waiting 1
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: cedulaType.id,
            status: "FOR_REQUESTING",
            residentSnapshot: testResidentSnapshot,
            additionalData: {},
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-004",
            isPriority: true
        }
    });
    // Waiting 2
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: cedulaType.id,
            status: "FOR_REQUESTING",
            residentSnapshot: testResidentSnapshot,
            additionalData: {},
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-005",
            isPriority: false
        }
    });

    console.log("📝 Seeding BPLO (Business Permit) Queue (2 Counters)...");
    // BPLO Window 1 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: bploType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "BPLO Window 1" },
            appointmentDate: today,
            appointmentSlot: "01:00 PM - 04:00 PM",
            queueNumber: "07062026-PM-TEST-010",
            isPriority: false
        }
    });
    // BPLO Window 2 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: bploType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "BPLO Window 2" },
            appointmentDate: today,
            appointmentSlot: "01:00 PM - 04:00 PM",
            queueNumber: "07062026-PM-TEST-011",
            isPriority: true
        }
    });
    // Waiting
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: bploType.id,
            status: "FOR_REQUESTING",
            residentSnapshot: testResidentSnapshot,
            additionalData: {},
            appointmentDate: today,
            appointmentSlot: "01:00 PM - 04:00 PM",
            queueNumber: "07062026-PM-TEST-012",
            isPriority: false
        }
    });

    console.log("📝 Seeding Registrar (Civil Registry) Queue (2 Counters)...");
    // Registrar Window 1 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: registrarType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "Registrar Window 1" },
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-020",
            isPriority: true
        }
    });
    // Registrar Window 2 (Now Serving)
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: registrarType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "Registrar Window 2" },
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-021",
            isPriority: false
        }
    });
    // Waiting
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: registrarType.id,
            status: "FOR_REQUESTING",
            residentSnapshot: testResidentSnapshot,
            additionalData: {},
            appointmentDate: today,
            appointmentSlot: "08:00 AM - 11:30 AM",
            queueNumber: "07062026-AM-TEST-022",
            isPriority: false
        }
    });

    console.log("📝 Seeding Engineering (Building Permit) Queue...");
    // Now Serving
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: engineeringType.id,
            status: "FOR_PROCESSING",
            residentSnapshot: testResidentSnapshot,
            additionalData: { counterName: "Engineering Desk 1" },
            appointmentDate: today,
            appointmentSlot: "01:00 PM - 04:00 PM",
            queueNumber: "07062026-PM-TEST-030",
            isPriority: false
        }
    });
    // Waiting
    await prisma.transaction.create({
        data: {
            userId: user.id,
            typeId: engineeringType.id,
            status: "FOR_REQUESTING",
            residentSnapshot: testResidentSnapshot,
            additionalData: {},
            appointmentDate: today,
            appointmentSlot: "01:00 PM - 04:00 PM",
            queueNumber: "07062026-PM-TEST-031",
            isPriority: false
        }
    });

    console.log("🎉 Beautiful multi-window queue seeder successfully completed!");
}

main()
    .catch(e => {
        console.error("❌ Seeding error:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
