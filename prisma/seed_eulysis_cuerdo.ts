import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedEulysisCuerdoData() {
    console.log("🌱 Starting Seeder for Citizen EULYSIS CUERDO & POSO Ticket Header...");

    // 1. Upsert User: EULYSIS CUERDO
    const user = await prisma.user.upsert({
        where: { email: "eulysiscuerdo@gmail.com" },
        update: {
            name: "EULYSIS CUERDO",
            role: "USER",
            rfid: "4225334591",
            isEmailVerified: true,
            isPasswordChanged: true,
        },
        create: {
            id: "cmrbfziu2000808tv9frb1xe8",
            name: "EULYSIS CUERDO",
            email: "eulysiscuerdo@gmail.com",
            password: "$2b$10$5C2Q4pJWkmrQPROuEV5/TOIpjZt6XaJlmUPxv5hw69y/ajX/VWSOq",
            role: "USER",
            isEmailVerified: true,
            isPasswordChanged: true,
            rfid: "4225334591",
        },
    });

    console.log(`✅ User EULYSIS CUERDO ready (ID: ${user.id})`);

    // 2. Fetch Violation masterlist
    const violations = await (prisma as any).trafficViolation.findMany({
        orderBy: { violationCode: "asc" },
    });

    const sec01 = violations.find((v: any) => v.violationCode === "SEC-01") || violations[0];
    const sec02 = violations.find((v: any) => v.violationCode === "SEC-02") || violations[1];

    // 3. Remove any previous transaction linked to TICK-2026-0010 so user can manually click forward to Treasury
    const ticketNo = "TICK-2026-0010";
    const existingTicket = await (prisma as any).ticketHeader.findFirst({
        where: { ticketNo },
    });

    if (existingTicket?.transactionId) {
        await (prisma as any).transaction.deleteMany({
            where: { id: existingTicket.transactionId },
        });
    }

    // 4. Upsert TicketHeader ONLY (without pre-created transaction)
    const ticketData = {
        ticketNo,
        violatorName: "EULYSIS CUERDO",
        violatorAddress: "Brgy. Poblacion, Mapandan, Pangasinan",
        birthDate: "1998-05-20",
        licenseNo: "N01-26-998877",
        plateNo: "ABC-1234",
        ownerName: "EULYSIS CUERDO",
        typeOfVehicle: "Motorcycle (Yamaha NMAX)",
        vehicleClass: "CLASS_A",
        isImpounded: true,
        impoundYard: "Mapandan POSO Impounding Facility",
        impoundedAt: new Date("2026-07-23T14:30:00Z"),
        impoundFee: 2000,
        location: "Poblacion Highway, Mapandan",
        barangay: "Poblacion",
        dateTime: new Date("2026-07-23T14:30:00Z"),
        officerName: "Jhon Emil Nilo",
        badgeNo: "POSO-001",
        officerUserId: "cmrvxmol90000vpdkidkni38x",
        status: "ISSUED",
        isPaid: false,
        transactionId: null,
        totalAmount: 1500,
    };

    if (!existingTicket) {
        await (prisma as any).ticketHeader.create({
            data: {
                ...ticketData,
                details: {
                    create: [
                        {
                            violationId: sec01?.id,
                            violationName: sec01?.violationName || "Failure to Wear Protective Helmet",
                            offenseLevel: 1,
                            amount: 500,
                        },
                        {
                            violationId: sec02?.id,
                            violationName: sec02?.violationName || "Driving Without Valid Driver's License",
                            offenseLevel: 1,
                            amount: 1000,
                        },
                    ],
                },
            },
        });
        console.log(`✅ Created POSO TicketHeader ${ticketNo} for EULYSIS CUERDO (Ready for manual Treasury Forwarding)`);
    } else {
        await (prisma as any).ticketHeader.update({
            where: { id: existingTicket.id },
            data: ticketData,
        });
        console.log(`~ Reset POSO TicketHeader ${ticketNo} for EULYSIS CUERDO (Ready for manual Treasury Forwarding)`);
    }

    console.log("🚀 EULYSIS CUERDO POSO Ticket Header Seeding Complete!");
}

seedEulysisCuerdoData()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
