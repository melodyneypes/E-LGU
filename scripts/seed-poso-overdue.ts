import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedOverduePosoTickets() {
    console.log("🌱 Starting POSO Overdue Tickets Seeder with real TrafficViolation links...");

    // 1. Ensure TrafficViolation Masterlist Records Exist
    const masterViolations = [
        {
            violationCode: "VIO-001",
            violationName: "Driving Without Wearing Helmet",
            firstOffenseFee: 500,
            secondOffenseFee: 1000,
            thirdOffenseFee: 1500,
        },
        {
            violationCode: "VIO-002",
            violationName: "Driving Without Valid Driver's License",
            firstOffenseFee: 1000,
            secondOffenseFee: 1500,
            thirdOffenseFee: 2500,
        },
        {
            violationCode: "VIO-003",
            violationName: "Illegal Parking in Designated No Parking Zones",
            firstOffenseFee: 1000,
            secondOffenseFee: 1500,
            thirdOffenseFee: 2000,
        },
        {
            violationCode: "VIO-004",
            violationName: "Obstruction of Public Roads and Sidewalks",
            firstOffenseFee: 1000,
            secondOffenseFee: 1500,
            thirdOffenseFee: 2000,
        },
        {
            violationCode: "VIO-005",
            violationName: "Disregarding Official Traffic Sign / Red Light Signal",
            firstOffenseFee: 1000,
            secondOffenseFee: 1500,
            thirdOffenseFee: 2000,
        },
        {
            violationCode: "VIO-006",
            violationName: "Reckless and Dangerous Driving",
            firstOffenseFee: 1000,
            secondOffenseFee: 2000,
            thirdOffenseFee: 3000,
        },
        {
            violationCode: "VIO-007",
            violationName: "Overloading Cargo / Passenger Capacity",
            firstOffenseFee: 1500,
            secondOffenseFee: 2000,
            thirdOffenseFee: 2500,
        },
        {
            violationCode: "VIO-008",
            violationName: "Expired Vehicle Registration",
            firstOffenseFee: 1000,
            secondOffenseFee: 1500,
            thirdOffenseFee: 2000,
        },
        {
            violationCode: "VIO-009",
            violationName: "Use of Modified Exhaust Pipes / Loud Muffler",
            firstOffenseFee: 1000,
            secondOffenseFee: 1500,
            thirdOffenseFee: 2000,
        },
    ];

    const dbViolationsMap = new Map<string, any>();

    for (const item of masterViolations) {
        const record = await prisma.trafficViolation.upsert({
            where: { id: item.violationCode }, // fallback if ID exists
            update: {
                violationName: item.violationName,
                firstOffenseFee: item.firstOffenseFee,
                secondOffenseFee: item.secondOffenseFee,
                thirdOffenseFee: item.thirdOffenseFee,
                isActive: true,
            },
            create: {
                id: item.violationCode,
                violationCode: item.violationCode,
                violationName: item.violationName,
                firstOffenseFee: item.firstOffenseFee,
                secondOffenseFee: item.secondOffenseFee,
                thirdOffenseFee: item.thirdOffenseFee,
                isActive: true,
            },
        });
        dbViolationsMap.set(item.violationCode, record);
    }
    console.log(`✅ Loaded & synced ${dbViolationsMap.size} TrafficViolation masterlist records.`);

    // 2. Fetch TransactionType for POSO
    let posoType = await prisma.transactionType.findFirst({
        where: { code: "POSO_TRAFFIC_FINE" },
    });

    if (!posoType) {
        posoType = await prisma.transactionType.create({
            data: {
                code: "POSO_TRAFFIC_FINE",
                name: "POSO Traffic Fine Settlement",
                category: "POSO",
                department: "POSO",
                baseFee: 500,
                description: "Traffic violation citation fine settlement",
            },
        });
        console.log("✅ Created missing POSO_TRAFFIC_FINE transaction type.");
    }

    // 3. Fetch or create a test violator user
    const violatorUser = await prisma.user.findFirst({
        where: { role: "USER" },
    });

    const now = new Date();

    // 5 Overdue Citation Ticket Samples linked directly to TrafficViolation table
    const overdueSamples = [
        {
            ticketNo: "POSO-OVERDUE-001",
            violatorName: "Juan Dela Cruz",
            violatorAddress: "Brgy. Poblacion, Mapandan, Pangasinan",
            licenseNo: "N01-18-998877",
            plateNo: "ABC-1234",
            typeOfVehicle: "Motorcycle",
            vehicleClass: "CLASS_A",
            location: "Barangay Poblacion Highway",
            officerName: "Officer R. Santos",
            badgeNo: "POSO-042",
            daysAgo: 14,
            isImpounded: false,
            impoundFee: 0,
            items: [
                { code: "VIO-001", offenseLevel: 1, amount: 500 },
                { code: "VIO-002", offenseLevel: 1, amount: 1000 },
            ],
        },
        {
            ticketNo: "POSO-OVERDUE-002",
            violatorName: "Maria Clara Santos",
            violatorAddress: "Brgy. Torres, Mapandan, Pangasinan",
            licenseNo: "N02-19-123456",
            plateNo: "XYZ-9876",
            typeOfVehicle: "Tricycle (PUV)",
            puvBodyName: "MATODA",
            puvBodyNo: "105",
            vehicleClass: "CLASS_A",
            location: "Public Market Area",
            officerName: "Officer M. Reyes",
            badgeNo: "POSO-018",
            daysAgo: 21,
            isImpounded: true,
            impoundFee: 500,
            impoundYard: "Mapandan POSO Impounding Yard",
            items: [
                { code: "VIO-003", offenseLevel: 2, amount: 1500 },
                { code: "VIO-004", offenseLevel: 1, amount: 1000 },
            ],
        },
        {
            ticketNo: "POSO-OVERDUE-003",
            violatorName: "Pedro Penduko",
            violatorAddress: "Brgy. Luyan, Mapandan, Pangasinan",
            licenseNo: "N03-20-654321",
            plateNo: "MC-4567",
            typeOfVehicle: "Private Sedan",
            vehicleClass: "CLASS_B",
            location: "Brgy. Luyan Intersection",
            officerName: "Officer J. Dizon",
            badgeNo: "POSO-055",
            daysAgo: 10,
            isImpounded: false,
            impoundFee: 0,
            items: [
                { code: "VIO-005", offenseLevel: 2, amount: 1500 },
                { code: "VIO-006", offenseLevel: 1, amount: 1000 },
            ],
        },
        {
            ticketNo: "POSO-OVERDUE-004",
            violatorName: "Ricardo Dalisay",
            violatorAddress: "Brgy. Coral, Mapandan, Pangasinan",
            licenseNo: "N04-21-789012",
            plateNo: "TRK-8899",
            typeOfVehicle: "Light Truck",
            vehicleClass: "CLASS_C",
            location: "National Highway, Brgy. Coral",
            officerName: "Officer R. Santos",
            badgeNo: "POSO-042",
            daysAgo: 30,
            isImpounded: true,
            impoundFee: 1500,
            impoundYard: "Mapandan POSO Central Impound Yard",
            items: [
                { code: "VIO-007", offenseLevel: 3, amount: 2500 },
                { code: "VIO-008", offenseLevel: 1, amount: 1000 },
            ],
        },
        {
            ticketNo: "POSO-OVERDUE-005",
            violatorName: "Luningning Garcia",
            violatorAddress: "Brgy. Amana, Mapandan, Pangasinan",
            licenseNo: "N05-22-345678",
            plateNo: "UV-3344",
            typeOfVehicle: "Motorcycle",
            vehicleClass: "CLASS_A",
            location: "Poblacion Plaza",
            officerName: "Officer M. Reyes",
            badgeNo: "POSO-018",
            daysAgo: 18,
            isImpounded: false,
            impoundFee: 0,
            items: [
                { code: "VIO-009", offenseLevel: 1, amount: 1000 },
            ],
        },
    ];

    console.log(`\n🧹 Cleaning up old test overdue tickets...`);
    await prisma.ticketHeader.deleteMany({
        where: {
            ticketNo: { in: overdueSamples.map((s) => s.ticketNo) },
        },
    });

    console.log(`\n🚀 Seeding 5 Overdue POSO Tickets & Details linked to TrafficViolation...`);

    for (const sample of overdueSamples) {
        const apprehensionDate = new Date(now.getTime() - sample.daysAgo * 24 * 60 * 60 * 1000);
        
        // Map details with foreign key violationId
        const detailRecords = sample.items.map((item) => {
            const vObj = dbViolationsMap.get(item.code);
            return {
                violationId: vObj ? vObj.id : null,
                violationName: vObj ? vObj.violationName : item.code,
                offenseLevel: item.offenseLevel,
                amount: item.amount,
            };
        });

        const totalFine = detailRecords.reduce((sum, d) => sum + d.amount, 0);
        const grandTotal = totalFine + (sample.isImpounded ? sample.impoundFee : 0);

        const residentSnapshot = {
            fullName: sample.violatorName,
            licenseNo: sample.licenseNo,
            plateNo: sample.plateNo,
            address: sample.violatorAddress,
            isRegisteredUser: Boolean(violatorUser),
        };

        const additionalData = {
            ticketNo: sample.ticketNo,
            violatorName: sample.violatorName,
            licenseNo: sample.licenseNo,
            plateNo: sample.plateNo,
            isImpounded: sample.isImpounded,
            impoundFee: sample.impoundFee,
            impoundYard: sample.impoundYard || null,
            vehicleClass: sample.vehicleClass,
            violations: detailRecords.map((d) => ({
                violationId: d.violationId,
                name: d.violationName,
                level: d.offenseLevel,
                fine: d.amount,
            })),
            ticketsBreakdown: [
                {
                    ticketNo: sample.ticketNo,
                    baseFine: totalFine,
                    impoundFee: sample.impoundFee,
                    totalFine: grandTotal,
                },
            ],
        };

        const fiscalSnapshot = {
            baseFineTotal: totalFine,
            impoundFee: sample.impoundFee,
            totalAmount: grandTotal,
        };

        // 1. Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                queueNumber: sample.ticketNo,
                userId: violatorUser?.id || null,
                typeId: posoType.id,
                status: "UNPAID",
                isPaid: false,
                totalAmount: grandTotal,
                residentSnapshot,
                additionalData,
                fiscalSnapshot,
                processedBy: "POSO Mobile App (Enforcer)",
                createdAt: apprehensionDate,
                updatedAt: apprehensionDate,
            },
        });

        // 2. Create TicketHeader with linked TicketDetail -> TrafficViolation foreign key
        const ticket = await prisma.ticketHeader.create({
            data: {
                ticketNo: sample.ticketNo,
                violatorName: sample.violatorName,
                violatorAddress: sample.violatorAddress,
                licenseNo: sample.licenseNo,
                plateNo: sample.plateNo,
                typeOfVehicle: sample.typeOfVehicle,
                puvBodyName: sample.puvBodyName || null,
                puvBodyNo: sample.puvBodyNo || null,
                vehicleClass: sample.vehicleClass,
                location: sample.location,
                officerName: sample.officerName,
                badgeNo: sample.badgeNo,
                dateTime: apprehensionDate,
                totalAmount: totalFine,
                isImpounded: sample.isImpounded,
                impoundFee: sample.impoundFee,
                impoundYard: sample.impoundYard || null,
                impoundedAt: sample.isImpounded ? apprehensionDate : null,
                isReleased: false,
                status: "ISSUED",
                isPaid: false,
                transactionId: transaction.id,
                remarks: `Apprehended by ${sample.officerName} on ${apprehensionDate.toLocaleDateString()}. Fine pending at Treasury.`,
                createdAt: apprehensionDate,
                updatedAt: apprehensionDate,
                details: {
                    create: detailRecords,
                },
            },
        });

        // Link ticketHeaderId in transaction additionalData
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                additionalData: {
                    ...additionalData,
                    ticketHeaderId: ticket.id,
                    ticketId: ticket.id,
                },
            },
        });

        console.log(`  ✅ Ticket #${ticket.ticketNo} (${sample.violatorName}) -> Linked to TrafficViolation table | Total: ₱${grandTotal.toLocaleString()}`);
    }

    console.log("\n🎉 Successfully seeded 5 POSO Overdue Tickets directly linked to TrafficViolation masterlist!");
}

seedOverduePosoTickets()
    .catch((e) => {
        console.error("❌ Error seeding overdue POSO tickets:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
