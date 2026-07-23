import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPosoData() {
    console.log("🌱 Starting POSO Traffic Masterlist & Citations Seeder...");

    const officerId = "cmrvxmol90000vpdkidkni38x";
    const officerName = "Jhon Emil Nilo";

    // 1. Seed POSO TransactionType
    console.log("📌 Seeding POSO TransactionType...");
    await (prisma as any).transactionType.upsert({
        where: { code: "POSO_TRAFFIC_FINE" },
        update: {
            name: "POSO Traffic Violation Fine",
            category: "POSO",
            processorRole: "TREASURY_STAFF",
            isActive: true,
        },
        create: {
            code: "POSO_TRAFFIC_FINE",
            name: "POSO Traffic Violation Fine",
            description: "Payment settlement for POSO municipal traffic citations and ordinance apprehendings",
            category: "POSO",
            processorRole: "TREASURY_STAFF",
            isFixed: false,
            isActive: true,
        },
    });

    // 2. Seed Vehicle Classifications (Class A, Class B, Class C)
    console.log("📌 Seeding Vehicle Classifications...");
    const vehicleClassificationsData = [
        {
            code: "CLASS_A",
            className: "Class A: Motorcycles/Tricycles",
            description: "Motorcycles, Tricycles, E-Bikes",
            impoundFee: 2000,
        },
        {
            code: "CLASS_B",
            className: "Class B: Light 4-Wheeled Vehicles",
            description: "Sedan, AUV, SUV, Vans, Light Pickups",
            impoundFee: 5000,
        },
        {
            code: "CLASS_C",
            className: "Class C: Heavy 4-Wheeled/6-Wheeled+",
            description: "Trucks, Buses, Heavy Equipment, Trailers",
            impoundFee: 10000,
        },
    ];

    for (const vc of vehicleClassificationsData) {
        await (prisma as any).vehicleClassification.upsert({
            where: { code: vc.code },
            update: vc,
            create: vc,
        });
    }

    // 3. Seed Traffic Violations Masterlist
    console.log("📌 Seeding Traffic Violations Ordinance Masterlist...");
    const violationsData = [
        {
            violationCode: "SEC-01",
            violationName: "Failure to Wear Protective Helmet",
            firstOffenseFee: 500,
            secondOffenseFee: 1000,
            thirdOffenseFee: 1500,
            remarks: "Municipal Ordinance No. 2024-01: Mandatory helmet for motorcycle drivers and backriders.",
        },
        {
            violationCode: "SEC-02",
            violationName: "Driving Without Valid Driver's License",
            firstOffenseFee: 1000,
            secondOffenseFee: 2000,
            thirdOffenseFee: 3000,
            remarks: "Failure to present valid LTO driver's license upon apprehension.",
        },
        {
            violationCode: "SEC-03",
            violationName: "Illegal Parking / Obstruction of Public Highway",
            firstOffenseFee: 500,
            secondOffenseFee: 1000,
            thirdOffenseFee: 2000,
            remarks: "Parking on marked no-parking zones, sidewalks, or blocking public roads.",
        },
        {
            violationCode: "SEC-04",
            violationName: "Operating Unregistered / Expired Motor Vehicle",
            firstOffenseFee: 1500,
            secondOffenseFee: 3000,
            thirdOffenseFee: 5000,
            remarks: "LTO Registration expired or unregistered vehicle unit.",
        },
        {
            violationCode: "SEC-05",
            violationName: "Reckless Driving & Over-speeding",
            firstOffenseFee: 1000,
            secondOffenseFee: 2500,
            thirdOffenseFee: 5000,
            remarks: "Endangering pedestrians and other commuters along Mapandan highways.",
        },
    ];

    const seededViolations: any[] = [];
    for (const item of violationsData) {
        let v = await (prisma as any).trafficViolation.findFirst({
            where: { violationName: item.violationName },
        });
        if (!v) {
            v = await (prisma as any).trafficViolation.create({ data: item });
        } else {
            v = await (prisma as any).trafficViolation.update({
                where: { id: v.id },
                data: item,
            });
        }
        seededViolations.push(v);
    }
    console.log(`✅ Seeded ${seededViolations.length} Traffic Violations!`);

    // 2. Seed Mock Repeat Violator Apprehension Tickets
    console.log("🎫 Seeding Citation Tickets for Officer Jhon Emil Nilo...");

    // Violator 1: Juan Dela Cruz (Repeat Offender with 3 tickets to test Violator History & Repeat Notice)
    const repeatViolator = {
        name: "Juan Dela Cruz",
        licenseNo: "N01-18-987654",
        address: "Poblacion, Mapandan, Pangasinan",
        birthDate: "1995-08-15",
        plateNo: "ABC-1234",
    };

    const ticketsToCreate = [
        {
            ticketNo: "TICK-2026-0001",
            violatorName: repeatViolator.name,
            violatorAddress: repeatViolator.address,
            birthDate: repeatViolator.birthDate,
            licenseNo: repeatViolator.licenseNo,
            plateNo: repeatViolator.plateNo,
            ownerName: repeatViolator.name,
            typeOfVehicle: "Motorcycle (Single)",
            location: "Poblacion Public Market, Mapandan",
            barangay: "Poblacion",
            dateTime: new Date("2026-06-10T09:30:00Z"),
            officerName: officerName,
            badgeNo: "POSO-001",
            officerUserId: officerId,
            status: "RESOLVED" as any,
            isPaid: true,
            details: [
                {
                    violationId: seededViolations[0].id, // Helmet
                    violationName: seededViolations[0].violationName,
                    offenseLevel: 1,
                    amount: 500,
                },
            ],
            totalAmount: 500,
        },
        {
            ticketNo: "TICK-2026-0002",
            violatorName: repeatViolator.name,
            violatorAddress: repeatViolator.address,
            birthDate: repeatViolator.birthDate,
            licenseNo: repeatViolator.licenseNo,
            plateNo: repeatViolator.plateNo,
            ownerName: repeatViolator.name,
            typeOfVehicle: "Motorcycle (Single)",
            location: "Brgy. Luyan Intersection, Mapandan",
            barangay: "Luyan",
            dateTime: new Date("2026-07-01T14:15:00Z"),
            officerName: officerName,
            badgeNo: "POSO-001",
            officerUserId: officerId,
            status: "RESOLVED" as any,
            isPaid: true,
            details: [
                {
                    violationId: seededViolations[0].id, // Helmet (2nd offense)
                    violationName: seededViolations[0].violationName,
                    offenseLevel: 2,
                    amount: 1000,
                },
                {
                    violationId: seededViolations[2].id, // Illegal Parking (1st offense)
                    violationName: seededViolations[2].violationName,
                    offenseLevel: 1,
                    amount: 500,
                },
            ],
            totalAmount: 1500,
        },
        {
            ticketNo: "TICK-2026-0003",
            violatorName: repeatViolator.name,
            violatorAddress: repeatViolator.address,
            birthDate: repeatViolator.birthDate,
            licenseNo: repeatViolator.licenseNo,
            plateNo: repeatViolator.plateNo,
            ownerName: repeatViolator.name,
            typeOfVehicle: "Motorcycle (Single)",
            location: "Mapandan Municipal Hall Highway",
            barangay: "Poblacion",
            dateTime: new Date("2026-07-20T11:00:00Z"),
            officerName: officerName,
            badgeNo: "POSO-001",
            officerUserId: officerId,
            status: "ISSUED" as any,
            isPaid: false,
            details: [
                {
                    violationId: seededViolations[0].id, // Helmet (3rd offense!)
                    violationName: seededViolations[0].violationName,
                    offenseLevel: 3,
                    amount: 1500,
                },
                {
                    violationId: seededViolations[1].id, // No License (1st offense)
                    violationName: seededViolations[1].violationName,
                    offenseLevel: 1,
                    amount: 1000,
                },
            ],
            totalAmount: 2500,
        },
        // Violator 2: Pedro Penduko (Single ticket)
        {
            ticketNo: "TICK-2026-0004",
            violatorName: "Pedro Penduko",
            violatorAddress: "Brgy. Torres, Mapandan, Pangasinan",
            birthDate: "1988-03-22",
            licenseNo: "N02-15-112233",
            plateNo: "XYZ-9988",
            ownerName: "Pedro Penduko",
            typeOfVehicle: "Tricycle",
            vehicleClass: "CLASS_A",
            location: "Torres Bridge, Mapandan",
            barangay: "Torres",
            dateTime: new Date("2026-07-22T08:45:00Z"),
            officerName: officerName,
            badgeNo: "POSO-001",
            officerUserId: officerId,
            status: "ISSUED" as any,
            isPaid: false,
            details: [
                {
                    violationId: seededViolations[3].id, // Unregistered
                    violationName: seededViolations[3].violationName,
                    offenseLevel: 1,
                    amount: 1500,
                },
            ],
            totalAmount: 1500,
        },
        // Violator 3: Juan Dela Cruz (Class A Impounded Ticket)
        {
            ticketNo: "TICK-2026-0005",
            violatorName: "Juan Dela Cruz",
            violatorAddress: "Brgy. Luyan, Mapandan, Pangasinan",
            birthDate: "1994-08-15",
            licenseNo: "N01-18-987654",
            plateNo: "MC-8812",
            ownerName: "Juan Dela Cruz",
            typeOfVehicle: "Motorcycle (Single)",
            vehicleClass: "CLASS_A",
            isImpounded: true,
            impoundYard: "Mapandan POSO Impounding Facility",
            impoundedAt: new Date("2026-07-23T09:00:00Z"),
            impoundFee: 2000,
            location: "Poblacion Public Market, Mapandan",
            barangay: "Poblacion",
            dateTime: new Date("2026-07-23T09:00:00Z"),
            officerName: officerName,
            badgeNo: "POSO-001",
            officerUserId: officerId,
            status: "ISSUED" as any,
            isPaid: false,
            details: [
                {
                    violationId: seededViolations[3].id, // Unregistered
                    violationName: seededViolations[3].violationName,
                    offenseLevel: 1,
                    amount: 1500,
                },
            ],
            totalAmount: 1500,
        },
        // Violator 4: Marco Valenzuela (Class B Impounded Light 4-Wheeler)
        {
            ticketNo: "TICK-2026-0006",
            violatorName: "Marco Valenzuela",
            violatorAddress: "Brgy. Nilombot, Mapandan, Pangasinan",
            birthDate: "1985-11-04",
            licenseNo: "N03-12-456789",
            plateNo: "NBM-8899",
            ownerName: "Marco Valenzuela",
            typeOfVehicle: "SUV (Toyota Fortuner)",
            vehicleClass: "CLASS_B",
            isImpounded: true,
            impoundYard: "Mapandan POSO Impounding Facility",
            impoundedAt: new Date("2026-07-23T10:30:00Z"),
            impoundFee: 5000,
            location: "Primark Town Center Highway, Mapandan",
            barangay: "Poblacion",
            dateTime: new Date("2026-07-23T10:30:00Z"),
            officerName: officerName,
            badgeNo: "POSO-001",
            officerUserId: officerId,
            status: "ISSUED" as any,
            isPaid: false,
            details: [
                {
                    violationId: seededViolations[1].id, // Driving Without License
                    violationName: seededViolations[1].violationName,
                    offenseLevel: 1,
                    amount: 1000,
                },
                {
                    violationId: seededViolations[2].id, // Illegal Parking / Obstruction
                    violationName: seededViolations[2].violationName,
                    offenseLevel: 1,
                    amount: 500,
                },
            ],
            totalAmount: 1500,
        },
    ];

    for (const t of ticketsToCreate) {
        const { details, ...headerData } = t;

        const existingTicket = await (prisma as any).ticketHeader.findFirst({
            where: { ticketNo: headerData.ticketNo },
        });

        if (!existingTicket) {
            await (prisma as any).ticketHeader.create({
                data: {
                    ...headerData,
                    details: {
                        create: details,
                    },
                },
            });
            console.log(`  + Created ticket ${headerData.ticketNo} for ${headerData.violatorName}`);
        } else {
            await (prisma as any).ticketHeader.update({
                where: { id: existingTicket.id },
                data: headerData,
            });
            console.log(`  ~ Updated ticket ${headerData.ticketNo} impound details.`);
        }
    }

    console.log("🎉 POSO Data Seeding Completed Successfully!");
}

seedPosoData()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
