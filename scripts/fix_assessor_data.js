const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BARANGAYS = [
  "Abar", "Ambalangan-Dalin", "Coral", "Golden", "Luyan",
  "Nilombot", "Poblacion", "Primicias", "Santa Maria", "Torres"
];

async function main() {
  console.log("🛠️ Fixing RPT TransactionTypes & Seeding Assessor Hub Data...");

  // 1. Ensure RPT TransactionTypes exist with category = "RPT"
  const rptTypes = [
    {
      code: "RPT_CAT1",
      name: "RPT Category 1: Routine Annual Tax Payment & Clearance",
      description: "Annual Real Property Tax payment and Clearance issuance",
      category: "RPT",
      baseFee: 250.00,
      processorRole: "TREASURY_STAFF"
    },
    {
      code: "RPT_CAT2",
      name: "RPT Category 2: New Property Declaration & Assessment",
      description: "Declaration of new land parcel or newly constructed building",
      category: "RPT",
      baseFee: 500.00,
      processorRole: "ASSESSOR"
    },
    {
      code: "RPT_CAT3",
      name: "RPT Category 3: Transfer of Property Ownership",
      description: "Transfer of property ownership and Tax Declaration updating",
      category: "RPT",
      baseFee: 750.00,
      processorRole: "ASSESSOR"
    }
  ];

  const typeMap = {};

  for (const t of rptTypes) {
    const existing = await prisma.transactionType.findUnique({ where: { code: t.code } });
    if (existing) {
      const updated = await prisma.transactionType.update({
        where: { code: t.code },
        data: { category: "RPT", name: t.name }
      });
      typeMap[t.code] = updated.id;
      console.log(`Updated RPT Type ${t.code} (${updated.id}) -> category = "RPT"`);
    } else {
      const created = await prisma.transactionType.create({
        data: {
          code: t.code,
          name: t.name,
          description: t.description,
          category: "RPT",
          baseFee: t.baseFee,
          processorRole: t.processorRole,
          slaDays: 3,
          isFixed: false,
          requiredDocs: JSON.stringify(["Deed of Sale", "Tax Declaration", "Valid ID"]),
          formSchema: JSON.stringify({})
        }
      });
      typeMap[t.code] = created.id;
      console.log(`Created RPT Type ${t.code} (${created.id}) -> category = "RPT"`);
    }
  }

  // Also update any other RPT type to category = "RPT"
  await prisma.transactionType.updateMany({
    where: {
      OR: [
        { code: { startsWith: "RPT_" } },
        { name: { contains: "Real Property", mode: "insensitive" } }
      ]
    },
    data: { category: "RPT" }
  });

  // 2. Fetch residents for sample RPT declarations
  const residents = await prisma.resident.findMany({
    take: 100
  });

  if (residents.length === 0) {
    console.log("No residents found in database.");
    return;
  }

  console.log(`Found ${residents.length} residents. Generating 45 sample RPT Assessor applications...`);

  // Valid TransactionStatus enum values
  const validStatuses = ["FOR_REQUESTING", "FOR_INSPECTION", "EVALUATED", "PAID", "RELEASED", "REJECTED"];
  const rptCategories = ["RPT_CAT1", "RPT_CAT2", "RPT_CAT3"];

  let createdCount = 0;

  for (let i = 0; i < 45; i++) {
    const resident = getRandomItem(residents);
    const catCode = getRandomItem(rptCategories);
    const typeId = typeMap[catCode] || typeMap["RPT_CAT2"];
    const status = getRandomItem(validStatuses);
    const barangay = getRandomItem(BARANGAYS);

    const assessedVal = getRandomInt(150000, 4500000);
    const tdnNum = `TDN-2026-${getRandomInt(10000, 99999)}`;
    const pinNum = `028-14-${getRandomInt(100, 999)}-${getRandomInt(10, 99)}`;

    const snapshot = {
      firstName: resident.firstName,
      lastName: resident.lastName,
      fullName: `${resident.firstName} ${resident.lastName}`,
      barangay: barangay,
      contactNumber: resident.contactNumber || "09171234567",
      email: resident.email || "resident@example.com",
      civilStatus: resident.civilStatus || "Single"
    };

    const apptDate = new Date(Date.now() + getRandomInt(1, 14) * 24 * 60 * 60 * 1000);

    try {
      await prisma.transaction.create({
        data: {
          typeId: typeId,
          userId: resident.userId || undefined,
          status: status,
          residentSnapshot: snapshot,
          additionalData: {
            categoryCode: catCode,
            ownerName: `${resident.firstName} ${resident.lastName}`,
            tdn: tdnNum,
            pin: pinNum,
            assessedValue: assessedVal,
            marketValue: assessedVal * 1.5,
            propertyType: getRandomItem(["Residential Land", "Agricultural Land", "Commercial Building", "Residential House"]),
            barangay: barangay,
            areaSqMters: getRandomInt(120, 1500),
            assessorStatus: status === "RELEASED" || status === "PAID" ? "APPROVED" : (status === "REJECTED" ? "REJECTED" : "PENDING")
          },
          totalAmount: Math.round(assessedVal * 0.01),
          isPaid: status === "PAID" || status === "RELEASED",
          appointmentDate: apptDate,
          appointmentSlot: "09:00 AM - 10:00 AM",
          queueNumber: `A-${getRandomInt(1000, 9999)}-${i}`,
          createdAt: new Date(Date.now() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000)
        }
      });
      createdCount++;
    } catch (err) {
      console.error("Error creating RPT tx:", err.message);
    }
  }

  console.log(`🎉 Successfully seeded ${createdCount} Assessor RPT applications! Assessor Hub is now fully populated.`);
}

main()
  .catch(err => console.error("Error running fix_assessor_data script:", err))
  .finally(async () => await prisma.$disconnect());
