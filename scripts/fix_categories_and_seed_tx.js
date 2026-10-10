const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🛠️ Aligning TransactionType categories and generating live transactions for Vercel...");

  // 1. Fetch all transaction types
  const types = await prisma.transactionType.findMany();
  console.log(`Found ${types.length} transaction types.`);

  for (const t of types) {
    let newCat = t.category;
    if (t.code.startsWith("CEDULA") || t.name.toLowerCase().includes("community tax") || t.name.toLowerCase().includes("cedula")) {
      newCat = "CEDULA";
    } else if (t.code.startsWith("BUSINESS_PERMIT") || t.name.toLowerCase().includes("business permit")) {
      newCat = "Business Permit";
    } else if (t.code.startsWith("RPT") || t.name.toLowerCase().includes("real property")) {
      newCat = "Real Property Tax";
    } else if (t.code.startsWith("LCR") || t.code.startsWith("CIVIL") || t.category === "Civil Registry") {
      newCat = "Civil Registry";
    } else if (t.code.startsWith("BUILDING") || t.code.startsWith("OCCUPANCY") || t.name.toLowerCase().includes("building permit")) {
      newCat = "Building Permit";
    } else if (t.code.startsWith("POSO") || t.name.toLowerCase().includes("citation")) {
      newCat = "POSO";
    }

    if (newCat !== t.category) {
      await prisma.transactionType.update({
        where: { id: t.id },
        data: { category: newCat, processorRole: "TREASURY_STAFF" }
      });
      console.log(`Updated ${t.code} (${t.name}): category -> "${newCat}"`);
    }
  }

  // 2. Fetch residents to attach transactions to
  const residents = await prisma.resident.findMany({
    take: 500
  });

  console.log(`Fetched ${residents.length} residents for seeding transactions.`);

  if (residents.length === 0) {
    console.log("No residents found. Please run seed script first.");
    return;
  }

  const updatedTypes = await prisma.transactionType.findMany();

  // Create transactions for EACH category specifically
  const categoriesToSeed = ["CEDULA", "Business Permit", "Real Property Tax", "Civil Registry", "Building Permit", "POSO"];
  const statuses = ["FOR_REQUESTING", "PAID", "UNPAID", "FOR_PROCESSING", "FOR_CLAIM", "COMPLETED"];

  let seededCount = 0;

  for (const cat of categoriesToSeed) {
    const matchingTypes = updatedTypes.filter(t => t.category === cat || t.code.startsWith(cat.substring(0, 3).toUpperCase()));
    const targetType = matchingTypes.length > 0 ? matchingTypes[0] : updatedTypes[0];

    console.log(`Seeding 25 transactions for category "${cat}" using type "${targetType.name}"...`);

    for (let i = 0; i < 25; i++) {
      const resident = getRandomItem(residents);
      const status = getRandomItem(statuses);
      const amount = targetType.baseFee > 0 ? targetType.baseFee : getRandomInt(250, 3500);

      const snapshot = {
        firstName: resident.firstName,
        lastName: resident.lastName,
        middleName: resident.middleName || "",
        fullName: `${resident.firstName} ${resident.lastName}`,
        barangay: resident.barangay,
        contactNumber: resident.contactNumber || "09171234567",
        email: resident.email || "resident@example.com",
        civilStatus: resident.civilStatus || "Single",
        houseNumber: resident.houseNumber || "123",
        street: resident.street || "Main St"
      };

      try {
        await prisma.transaction.create({
          data: {
            typeId: targetType.id,
            userId: resident.userId || undefined,
            status: status,
            residentSnapshot: snapshot,
            additionalData: {
              purpose: "Official Government Requirement",
              businessName: cat === "Business Permit" ? `${resident.lastName} Trading & Enterprise` : undefined
            },
            totalAmount: amount,
            isPaid: status === "PAID" || status === "COMPLETED",
            paymentType: "CASH",
            paymentReference: status === "PAID" ? `REF-${getRandomInt(100000, 999999)}` : undefined,
            createdAt: new Date(Date.now() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000)
          }
        });
        seededCount++;
      } catch (err) {
        console.error(`Error creating tx for ${cat}:`, err.message);
      }
    }
  }

  console.log(`🎉 Successfully created ${seededCount} categorized transactions! Treasury Hub is now fully populated for Vercel.`);
}

main()
  .catch(err => console.error("Error running fix script:", err))
  .finally(async () => await prisma.$disconnect());
