import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🚦 Starting POSO Tickets Seeding Script...");

    // 1. Target Officer & Violator IDs provided by user
    const officerId = "cmryliald0006vpx01w577hz2";
    const officerName = "JhonEmil Nilo";

    const violatorUserId = "cmqnw0x430002ji047x24wkaf";
    const violatorName = "JUAN DELA CRUZ";
    const violatorLicenseNo = "N01-12-345678";
    const violatorAddress = "Poblacion, Mapandan, Pangasinan";

    // Ensure User accounts exist or fetch them
    let officerUser = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officerUser) {
        officerUser = await prisma.user.findFirst({ where: { role: "POSO_OFFICER" } });
    }

    let violatorUser = await prisma.user.findUnique({ where: { id: violatorUserId } });
    if (!violatorUser) {
        violatorUser = await prisma.user.findFirst({ where: { role: "USER" } });
    }

    const actualOfficerId = officerUser?.id || officerId;
    const actualOfficerName = officerUser?.name || officerName;

    const actualViolatorId = violatorUser?.id || violatorUserId;
    const actualViolatorName = violatorUser?.name || violatorName;

    // 2. Ensure TrafficViolations exist
    console.log("📋 Ensuring Traffic Violations exist in database...");
    const defaultViolations = [
        { code: "TV-001", name: "No Safety Helmet", fee1: 500, fee2: 1000, fee3: 1500 },
        { code: "TV-002", name: "Driving Without Valid License", fee1: 1000, fee2: 2000, fee3: 3000 },
        { code: "TV-003", name: "Reckless Driving", fee1: 1500, fee2: 3000, fee3: 5000 },
        { code: "TV-004", name: "Expired Vehicle Registration", fee1: 1000, fee2: 1500, fee3: 2500 },
        { code: "TV-005", name: "Illegal Parking / Obstruction", fee1: 500, fee2: 1000, fee3: 1500 },
        { code: "TV-006", name: "Failure to Wear Seatbelt", fee1: 500, fee2: 1000, fee3: 1500 },
    ];

    const seededViolations: any[] = [];
    for (const v of defaultViolations) {
        const existing = await prisma.trafficViolation.findFirst({
            where: { violationName: v.name }
        });
        if (existing) {
            seededViolations.push(existing);
        } else {
            const created = await prisma.trafficViolation.create({
                data: {
                    violationCode: v.code,
                    violationName: v.name,
                    firstOffenseFee: v.fee1,
                    secondOffenseFee: v.fee2,
                    thirdOffenseFee: v.fee3,
                    isActive: true
                }
            });
            seededViolations.push(created);
        }
    }

    // 3. Ensure VehicleClassifications exist
    console.log("🚗 Ensuring Vehicle Classifications exist in database...");
    const defaultVehicles = [
        { code: "MC", name: "Motorcycle / Scooter", fee: 200 },
        { code: "TC", name: "Tricycle (PUV / Private)", fee: 300 },
        { code: "SED", name: "Sedan / Light Vehicle", fee: 500 },
        { code: "TRK", name: "Truck / Heavy Vehicle", fee: 1000 },
    ];

    const seededVehicles: any[] = [];
    for (const veh of defaultVehicles) {
        const existing = await prisma.vehicleClassification.findUnique({
            where: { code: veh.code }
        });
        if (existing) {
            seededVehicles.push(existing);
        } else {
            const created = await prisma.vehicleClassification.create({
                data: {
                    code: veh.code,
                    className: veh.name,
                    impoundFee: veh.fee,
                    isActive: true
                }
            });
            seededVehicles.push(created);
        }
    }

    // 4. Ensure TransactionType POSO_CITATION exists
    let posoTxType = await prisma.transactionType.findUnique({ where: { code: "POSO_CITATION" } });
    if (!posoTxType) {
        posoTxType = await prisma.transactionType.create({
            data: {
                code: "POSO_CITATION",
                name: "POSO Traffic Violation Citation",
                description: "Apprehension citation ticket issued by POSO Enforcers",
                category: "POSO",
                baseFee: 0,
                isFixed: false,
                processorRole: "TREASURY_STAFF",
                isActive: true
            }
        });
    }

    // 5. Generate 8 Tickets (5 OVERDUE, 3 NON-OVERDUE)
    console.log("🎫 Generating 8 POSO Tickets (5 Overdue + 3 Non-Overdue)...");

    const plates = ["ABC-1234", "XYZ-5678", "MAP-2026", "PANG-999", "MC-7711", "TRK-4422", "TC-8833", "LGU-1010"];
    const locations = ["Poblacion Plaza", "Torres National Highway", "Nilombot Junction", "Apaya Crossing", "Pias Public Market"];

    const now = new Date();

    // 5 OVERDUE (dateTime = 8 to 20 days ago)
    const overdueDaysList = [9, 12, 14, 18, 20];

    // 3 NON-OVERDUE (dateTime = 1 to 4 days ago)
    const nonOverdueDaysList = [1, 2, 4];

    const ticketConfigs = [
        ...overdueDaysList.map((days, idx) => ({ isOverdue: true, daysAgo: days, index: idx + 1 })),
        ...nonOverdueDaysList.map((days, idx) => ({ isOverdue: false, daysAgo: days, index: idx + 6 })),
    ];

    let createdCount = 0;

    for (const cfg of ticketConfigs) {
        const ticketDate = new Date(now.getTime() - cfg.daysAgo * 24 * 60 * 60 * 1000);
        const ticketNo = `T-2026-${String(cfg.index).padStart(3, "0")}`;
        const plateNo = plates[cfg.index - 1];
        const vehObj = seededVehicles[(cfg.index - 1) % seededVehicles.length];
        const loc = locations[(cfg.index - 1) % locations.length];

        // Pick 1 to 3 random violations per ticket
        const sampleViolationsCount = ((cfg.index % 3) + 1); // 1, 2, or 3 violations
        const chosenViolations: typeof seededViolations = [];
        for (let i = 0; i < sampleViolationsCount; i++) {
            const vIndex = (cfg.index + i) % seededViolations.length;
            if (!chosenViolations.includes(seededViolations[vIndex])) {
                chosenViolations.push(seededViolations[vIndex]);
            }
        }

        const totalAmount = chosenViolations.reduce((sum, v) => sum + (v.firstOffenseFee || 500), 0);

        // 1. Create matching Transaction record
        const transaction = await prisma.transaction.create({
            data: {
                userId: actualViolatorId,
                typeId: posoTxType.id,
                status: "UNPAID",
                totalAmount: totalAmount,
                isPaid: false,
                residentSnapshot: {
                    fullName: actualViolatorName,
                    address: violatorAddress,
                    licenseNo: violatorLicenseNo,
                },
                additionalData: {
                    ticketNo,
                    violatorName: actualViolatorName,
                    licenseNo: violatorLicenseNo,
                    plateNo,
                    vehicleClass: vehObj.className,
                    officerName: actualOfficerName,
                },
                createdAt: ticketDate,
                updatedAt: ticketDate,
            }
        });

        // 2. Create TicketHeader record
        const ticketHeader = await prisma.ticketHeader.create({
            data: {
                ticketNo,
                violatorName: actualViolatorName,
                violatorAddress,
                licenseNo: violatorLicenseNo,
                licenseImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600",
                plateNo,
                ownerName: actualViolatorName,
                typeOfVehicle: vehObj.className,
                vehicleClass: vehObj.code,
                location: loc,
                latitude: 16.0267 + (cfg.index * 0.0015),
                longitude: 120.4528 + (cfg.index * 0.0012),
                dateTime: ticketDate,
                officerName: actualOfficerName,
                officerUserId: actualOfficerId,
                badgeNo: "POSO-ENF-001",
                totalAmount: totalAmount,
                status: "ISSUED",
                isPaid: false,
                transactionId: transaction.id,
                createdAt: ticketDate,
                updatedAt: ticketDate,
                details: {
                    create: chosenViolations.map((v) => ({
                        violationId: v.id,
                        violationName: v.violationName,
                        offenseLevel: 1,
                        amount: v.firstOffenseFee || 500,
                        createdAt: ticketDate,
                    }))
                }
            }
        });

        createdCount++;
        console.log(`  ✅ Ticket #${ticketHeader.ticketNo} seeded [${cfg.isOverdue ? "OVERDUE (" + cfg.daysAgo + " days ago)" : "NON-OVERDUE (" + cfg.daysAgo + " days ago)"}] - ${chosenViolations.length} Violations, Total: ₱${totalAmount}`);
    }

    console.log(`\n🎉 Successfully seeded ${createdCount} POSO Citation Tickets! (5 Overdue + 3 Non-Overdue)`);
}

main()
    .catch((e) => {
        console.error("❌ Seeding execution failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
