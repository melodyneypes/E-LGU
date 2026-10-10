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
  console.log("🛠️ Seeding Engineering Permit TransactionTypes & Engineer Hub Data...");

  // 1. Ensure Engineering TransactionTypes exist with exact codes
  const engTypes = [
    {
      code: "BUILDING_PERMIT",
      name: "Building Permit Application",
      description: "Application for new building construction or major structural modification",
      category: "Building Permit",
      baseFee: 1500.00,
      processorRole: "ENGINEER"
    },
    {
      code: "OCCUPANCY_PERMIT",
      name: "Certificate of Occupancy",
      description: "Certification for building occupancy upon inspection clearance",
      category: "Occupancy Permit",
      baseFee: 800.00,
      processorRole: "ENGINEER"
    },
    {
      code: "FENCING_PERMIT",
      name: "Fencing Permit Application",
      description: "Permit for boundary wall and perimeter fencing construction",
      category: "Building Permit",
      baseFee: 500.00,
      processorRole: "ENGINEER"
    },
    {
      code: "DEMOLITION_PERMIT",
      name: "Demolition Permit Application",
      description: "Permit for structure demolition and site clearance",
      category: "Building Permit",
      baseFee: 1000.00,
      processorRole: "ENGINEER"
    }
  ];

  const typeMap = {};

  for (const t of engTypes) {
    const existing = await prisma.transactionType.findUnique({ where: { code: t.code } });
    if (existing) {
      const updated = await prisma.transactionType.update({
        where: { code: t.code },
        data: { name: t.name, processorRole: "ENGINEER" }
      });
      typeMap[t.code] = updated.id;
      console.log(`Updated Eng Type ${t.code} (${updated.id})`);
    } else {
      const created = await prisma.transactionType.create({
        data: {
          code: t.code,
          name: t.name,
          description: t.description,
          category: t.category,
          baseFee: t.baseFee,
          processorRole: "ENGINEER",
          slaDays: 5,
          isFixed: false,
          requiredDocs: JSON.stringify(["Architectural Blueprint", "Structural Computations", "Barangay Clearance", "Lot Title"]),
          formSchema: JSON.stringify({})
        }
      });
      typeMap[t.code] = created.id;
      console.log(`Created Eng Type ${t.code} (${created.id})`);
    }
  }

  // 2. Fetch residents for sample Engineering Applications
  const residents = await prisma.resident.findMany({
    take: 100
  });

  if (residents.length === 0) {
    console.log("No residents found in database.");
    return;
  }

  console.log(`Found ${residents.length} residents. Generating 50 sample Engineering applications...`);

  // Valid TransactionStatus values for Engineer Hub tabs
  const validStatuses = [
    "FOR_REQUESTING", "FOR_REVISION", "FOR_INSPECTION",
    "FOR_PROCESSING", "FOR_CLAIM", "PAID", "RELEASED", "REJECTED"
  ];
  const engCodes = ["BUILDING_PERMIT", "OCCUPANCY_PERMIT", "FENCING_PERMIT", "DEMOLITION_PERMIT"];

  let createdCount = 0;

  for (let i = 0; i < 50; i++) {
    const resident = getRandomItem(residents);
    const engCode = getRandomItem(engCodes);
    const typeId = typeMap[engCode];
    const status = getRandomItem(validStatuses);
    const barangay = getRandomItem(BARANGAYS);

    const projectCost = getRandomInt(350000, 8500000);
    const appNo = `BP-2026-${getRandomInt(1000, 9999)}-${i}`;

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
            applicationNo: appNo,
            projectName: `${resident.lastName} ${engCode.replace('_PERMIT', '')} Project`,
            projectCost: projectCost,
            occupancyGroup: getRandomItem(["Group A - Residential", "Group B - Commercial", "Group C - Industrial"]),
            barangay: barangay,
            totalFloorArea: getRandomInt(80, 850),
            engineerStatus: status
          },
          totalAmount: Math.round(projectCost * 0.005) + 500,
          isPaid: status === "PAID" || status === "RELEASED",
          paymentType: "CASH",
          appointmentDate: apptDate,
          appointmentSlot: "10:00 AM - 11:00 AM",
          queueNumber: `E-${getRandomInt(1000, 9999)}-${i}`,
          createdAt: new Date(Date.now() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000)
        }
      });
      createdCount++;
    } catch (err) {
      console.error("Error creating Eng tx:", err.message);
    }
  }

  console.log(`🎉 Successfully seeded ${createdCount} Engineer Hub applications! Engineer Hub is now fully populated.`);
}

main()
  .catch(err => console.error("Error running fix_engineer_data script:", err))
  .finally(async () => await prisma.$disconnect());
