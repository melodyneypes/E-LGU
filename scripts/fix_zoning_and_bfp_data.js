const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("🛠️ Seeding / Updating Zoning Hub & BFP Hub transactions and credentials...");

  // 1. Ensure User Accounts for Barangay, MDRRMO, Zoning, BFP
  const commonPassword = "password123";
  const hashedPassword = await bcrypt.hash(commonPassword, 10);

  const accountsToEnsure = [
    {
      name: "Barangay Admin (General)",
      email: "barangay@lgu.gov.ph",
      password: hashedPassword,
      role: "BARANGAY_CAPTAIN",
      managedBarangay: "Poblacion",
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Apaya Barangay Captain",
      email: "captain@lgu.gov.ph",
      password: hashedPassword,
      role: "BARANGAY_CAPTAIN",
      managedBarangay: "Apaya",
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "MDRRMO Administrator",
      email: "mdrrmo@lgu.gov.ph",
      password: hashedPassword,
      role: "MDRRMO_ADMIN",
      department: "MDRRMO",
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Zoning Officer",
      email: "zoning@lgu.gov.ph",
      password: hashedPassword,
      role: "MPDC_ZONING",
      department: "ZONING",
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "BFP Fire Inspector",
      email: "bfp@lgu.gov.ph",
      password: hashedPassword,
      role: "BFP",
      department: "BFP",
      isEmailVerified: true,
      emailVerified: new Date(),
    }
  ];

  for (const acc of accountsToEnsure) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: acc.email },
        data: {
          password: hashedPassword,
          role: acc.role,
          department: acc.department || existing.department,
          managedBarangay: acc.managedBarangay || existing.managedBarangay,
        }
      });
      console.log(`Updated user account: ${acc.email} (${acc.role})`);
    } else {
      await prisma.user.create({ data: acc });
      console.log(`Created user account: ${acc.email} (${acc.role})`);
    }
  }

  // 2. Fetch Engineering / Zoning / BFP Permit Types
  const permitTypes = await prisma.transactionType.findMany({
    where: {
      OR: [
        { code: { startsWith: 'BUILDING_PERMIT' } },
        { code: { startsWith: 'OCCUPANCY_PERMIT' } },
        { code: { startsWith: 'FENCING_PERMIT' } },
        { code: { startsWith: 'DEMOLITION_PERMIT' } }
      ]
    }
  });

  console.log(`Found ${permitTypes.length} engineering transaction types.`);

  if (permitTypes.length === 0) {
    console.error("No permit types found!");
    return;
  }

  // 3. Fetch existing transactions under these permit types
  const existingTx = await prisma.transaction.findMany({
    where: {
      typeId: { in: permitTypes.map(t => t.id) }
    },
    take: 60
  });

  console.log(`Found ${existingTx.length} existing engineering permit transactions.`);

  const bfpStatuses = ["PENDING", "ACKNOWLEDGED", "COMPLETED"];
  const zoningStatuses = ["FOR_INSPECTION", "FOR_REINSPECTION", "EVALUATED", "ENDORSED", "FOR_PROCESSING"];

  let updatedCount = 0;
  for (let i = 0; i < existingTx.length; i++) {
    const tx = existingTx[i];
    const addData = typeof tx.additionalData === 'object' && tx.additionalData !== null ? { ...tx.additionalData } : {};
    
    // Build or update feeAssessment
    const currentFeeAssessment = addData.feeAssessment || {};
    const bfpStat = bfpStatuses[i % bfpStatuses.length];
    const zoningStat = zoningStatuses[i % zoningStatuses.length];

    addData.feeAssessment = {
      ...currentFeeAssessment,
      engineerEndorsedToZoning: true,
      engineeringApproved: true,
      bfpSubmitted: true,
      buildingFee: currentFeeAssessment.buildingFee || 4500,
      zoningFee: currentFeeAssessment.zoningFee || 2500,
      bfpFee: currentFeeAssessment.bfpFee || 3200,
      totalFee: (currentFeeAssessment.buildingFee || 4500) + (currentFeeAssessment.zoningFee || 2500) + (currentFeeAssessment.bfpFee || 3200),
      breakdown: [
        { label: "Building / Structural Assessment", amount: currentFeeAssessment.buildingFee || 4500 },
        { label: "Zoning & Land Use Clearance Fee", amount: currentFeeAssessment.zoningFee || 2500 },
        { label: "BFP Fire Safety Inspection Fee (FSC)", amount: currentFeeAssessment.bfpFee || 3200 },
      ]
    };

    addData.zoningStatus = zoningStat;
    addData.bfpStatus = bfpStat;

    if (bfpStat === "COMPLETED") {
      addData.bfpClearanceUrl = "https://example.com/bfp_clearance_sample.pdf";
      addData.bfpClearanceDate = new Date().toISOString();
    }

    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: bfpStat === "COMPLETED" ? "PAID" : "FOR_INSPECTION",
        additionalData: addData
      }
    });
    updatedCount++;
  }

  console.log(`✅ Successfully updated ${updatedCount} transactions for Zoning Hub & BFP Hub.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
