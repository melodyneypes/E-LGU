import { PrismaClient } from "@prisma/client";
import lguConfig from "../config/lgu.config.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Comprehensive Market Stall Module Seeding...");

  // ==============================================
  // 1. SEED MARKET SECTIONS (StallType)
  // ==============================================
  const sectionsData = [
    { code: "MEAT", name: "Meat & Poultry Section", description: "Fresh pork, beef, chicken, and processed meats." },
    { code: "FISH", name: "Wet Market Fish Section", description: "Fresh local sea fish, bangus, tilapia, and seafood." },
    { code: "VEG", name: "Fruits & Vegetables Section", description: "Fresh local farm produce, highland vegetables, and fresh fruits." },
    { code: "DRY", name: "Dry Goods & Apparel Section", description: "Clothing, footwear, kitchenware, and general household merchandise." },
    { code: "FOOD", name: "Food Court & Eatery Section", description: "Cooked meals, carinderia, snacks, and beverages." },
  ];

  console.log("-> Seeding Stall Types / Sections...");
  const createdStallTypes: Record<string, any> = {};

  for (const item of sectionsData) {
    const st = await (prisma as any).stallType.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        createdBy: "SYSTEM_SEEDER",
      },
    });
    createdStallTypes[item.code] = st;
  }

  // Sample fee presets used for stall assignment
  const sampleFeePresets: Record<string, { name: string; amount: number }> = {
    GARBAGE: { name: "Daily Garbage Collection Fee", amount: 20 },
    LIGHT: { name: "Electricity / Lighting Fee", amount: 50 },
    WATER: { name: "Sanitation & Water Fee", amount: 30 },
    SECURITY: { name: "Night Security Guard Fee", amount: 15 },
  };

  // ==============================================
  // 3. SEED VENDORS & COLLECTOR USERS
  // ==============================================
  console.log("-> Seeding Sample Vendor Users & Collector...");
  
  const vendor1 = await prisma.user.upsert({
    where: { email: lguConfig.seedAccounts.marketVendor1Email },
    update: {},
    create: {
      name: lguConfig.seedNames.marketVendor1,
      email: lguConfig.seedAccounts.marketVendor1Email,
      role: "USER",
    },
  });

  const vendor2 = await prisma.user.upsert({
    where: { email: lguConfig.seedAccounts.marketVendor2Email },
    update: {},
    create: {
      name: lguConfig.seedNames.marketVendor2,
      email: lguConfig.seedAccounts.marketVendor2Email,
      role: "USER",
    },
  });

  const vendor3 = await prisma.user.upsert({
    where: { email: lguConfig.seedAccounts.marketVendor3Email },
    update: {},
    create: {
      name: lguConfig.seedNames.marketVendor3,
      email: lguConfig.seedAccounts.marketVendor3Email,
      role: "USER",
    },
  });

  const vendor4 = await prisma.user.upsert({
    where: { email: lguConfig.seedAccounts.marketVendor4Email },
    update: {},
    create: {
      name: lguConfig.seedNames.marketVendor4,
      email: lguConfig.seedAccounts.marketVendor4Email,
      role: "USER",
    },
  });

  // Fetch or create a Treasury Officer Collector User
  let collectorUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "TREASURY_STAFF", "MAYOR"] as any } },
  });

  if (!collectorUser) {
    collectorUser = await prisma.user.create({
      data: {
        name: lguConfig.seedNames.marketCollector,
        email: lguConfig.seedAccounts.marketCollectorEmail,
        role: "TREASURY_STAFF",
        department: "TREASURY",
      },
    });
  }

  // ==============================================
  // 4. SEED MARKET STALLS & ATTACH FEES (Stall & StallOtherFee)
  // ==============================================
  const stallsMasterData = [
    // Meat Section
    { stallNumber: "MEAT-01", stallTypeCode: "MEAT", vendorId: vendor1.id, status: "OCCUPIED", dailyRate: 60, monthlyRate: 1800, dailyRateOverdueFee: 10, monthlyRateOverdueFee: 100, attachedFees: ["GARBAGE", "LIGHT"] },
    { stallNumber: "MEAT-02", stallTypeCode: "MEAT", vendorId: null, status: "VACANT", dailyRate: 60, monthlyRate: 1800, dailyRateOverdueFee: 10, monthlyRateOverdueFee: 100, attachedFees: ["GARBAGE"] },
    { stallNumber: "MEAT-03", stallTypeCode: "MEAT", vendorId: null, status: "MAINTENANCE", dailyRate: 60, monthlyRate: 1800, dailyRateOverdueFee: 10, monthlyRateOverdueFee: 100, attachedFees: [] },
    
    // Fish Section
    { stallNumber: "FISH-01", stallTypeCode: "FISH", vendorId: vendor2.id, status: "OCCUPIED", dailyRate: 50, monthlyRate: 1500, dailyRateOverdueFee: 10, monthlyRateOverdueFee: 100, attachedFees: ["GARBAGE", "WATER"] },
    { stallNumber: "FISH-02", stallTypeCode: "FISH", vendorId: null, status: "VACANT", dailyRate: 50, monthlyRate: 1500, dailyRateOverdueFee: 10, monthlyRateOverdueFee: 100, attachedFees: ["GARBAGE", "WATER"] },
    { stallNumber: "FISH-03", stallTypeCode: "FISH", vendorId: null, status: "RESERVED", dailyRate: 55, monthlyRate: 1650, dailyRateOverdueFee: 10, monthlyRateOverdueFee: 100, attachedFees: ["GARBAGE"] },
    
    // Vegetables Section
    { stallNumber: "VEG-01", stallTypeCode: "VEG", vendorId: vendor3.id, status: "OCCUPIED", dailyRate: 40, monthlyRate: 1200, dailyRateOverdueFee: 5, monthlyRateOverdueFee: 50, attachedFees: ["GARBAGE"] },
    { stallNumber: "VEG-02", stallTypeCode: "VEG", vendorId: null, status: "VACANT", dailyRate: 40, monthlyRate: 1200, dailyRateOverdueFee: 5, monthlyRateOverdueFee: 50, attachedFees: ["GARBAGE"] },
    
    // Dry Goods Section
    { stallNumber: "DRY-01", stallTypeCode: "DRY", vendorId: null, status: "VACANT", dailyRate: 45, monthlyRate: 1350, dailyRateOverdueFee: 5, monthlyRateOverdueFee: 50, attachedFees: ["GARBAGE", "LIGHT"] },
    { stallNumber: "DRY-02", stallTypeCode: "DRY", vendorId: null, status: "VACANT", dailyRate: 45, monthlyRate: 1350, dailyRateOverdueFee: 5, monthlyRateOverdueFee: 50, attachedFees: ["GARBAGE"] },

    // Food Court Section
    { stallNumber: "FOOD-01", stallTypeCode: "FOOD", vendorId: vendor4.id, status: "OCCUPIED", dailyRate: 80, monthlyRate: 2400, dailyRateOverdueFee: 15, monthlyRateOverdueFee: 150, attachedFees: ["GARBAGE", "LIGHT", "WATER", "SECURITY"] },
    { stallNumber: "FOOD-02", stallTypeCode: "FOOD", vendorId: null, status: "VACANT", dailyRate: 80, monthlyRate: 2400, dailyRateOverdueFee: 15, monthlyRateOverdueFee: 150, attachedFees: ["GARBAGE", "LIGHT"] },
  ];

  console.log("-> Seeding Stalls & Attaching Other Fees...");
  const createdStallsMap: Record<string, any> = {};

  for (const st of stallsMasterData) {
    const stallType = createdStallTypes[st.stallTypeCode];
    if (!stallType) continue;

    const stall = await (prisma as any).stall.upsert({
      where: { stallNumber: st.stallNumber },
      update: {
        status: st.status as any,
        dailyRate: st.dailyRate,
        monthlyRate: st.monthlyRate,
        dailyRateOverdueFee: st.dailyRateOverdueFee,
        monthlyRateOverdueFee: st.monthlyRateOverdueFee,
        vendorId: st.vendorId,
        updatedBy: "SYSTEM_SEEDER",
      },
      create: {
        stallNumber: st.stallNumber,
        stallTypeId: stallType.id,
        vendorId: st.vendorId,
        status: st.status as any,
        dailyRate: st.dailyRate,
        monthlyRate: st.monthlyRate,
        dailyRateOverdueFee: st.dailyRateOverdueFee,
        monthlyRateOverdueFee: st.monthlyRateOverdueFee,
        createdBy: "SYSTEM_SEEDER",
      },
    });

    createdStallsMap[st.stallNumber] = stall;

    // Attach direct custom fees to stall
    for (const feeCode of st.attachedFees) {
      const feeObj = sampleFeePresets[feeCode];
      if (feeObj) {
        await (prisma as any).stallOtherFee.create({
          data: {
            stallId: stall.id,
            name: feeObj.name,
            amount: feeObj.amount,
            feeType: "DAILY",
            createdBy: "SYSTEM_SEEDER",
          },
        });
      }
    }
  }

  // ==============================================
  // 5. SEED DAILY TICKET COLLECTIONS (StallCollection)
  // ==============================================
  console.log("-> Seeding Daily Ticket Collection Receipts...");

  const sampleCollections = [
    {
      stallNumber: "MEAT-01",
      ticketNumber: "TKT-884910",
      baseAmount: 60,
      otherFeesPaid: 70, // 20 garbage + 50 light
      overdueFeePaid: 0,
      paymentMethod: "CASH",
      status: "PAID",
      remarks: "Paid in full via cash ticket collector",
      collectedDate: new Date(),
    },
    {
      stallNumber: "FISH-01",
      ticketNumber: "TKT-552190",
      baseAmount: 50,
      otherFeesPaid: 50, // 20 garbage + 30 water
      overdueFeePaid: 0,
      paymentMethod: "EPAYMENT",
      status: "PAID",
      remarks: "Paid via GCash e-Payment gateway",
      collectedDate: new Date(),
    },
    {
      stallNumber: "VEG-01",
      ticketNumber: "TKT-102938",
      baseAmount: 40,
      otherFeesPaid: 20, // 20 garbage
      overdueFeePaid: 0,
      paymentMethod: "CASH",
      status: "PAID",
      remarks: "Morning market collection",
      collectedDate: new Date(),
    },
    {
      stallNumber: "FOOD-01",
      ticketNumber: "TKT-773821",
      baseAmount: 80,
      otherFeesPaid: 115, // 20 garbage + 50 light + 30 water + 15 security
      overdueFeePaid: 15,
      paymentMethod: "CASH",
      status: "PAID",
      remarks: "Includes overdue penalty for late daily settlement",
      collectedDate: new Date(),
    },
  ];

  for (const col of sampleCollections) {
    const targetStall = createdStallsMap[col.stallNumber];
    if (!targetStall) continue;

    const totalAmountPaid = col.baseAmount + col.otherFeesPaid + col.overdueFeePaid;

    await (prisma as any).stallCollection.upsert({
      where: { ticketNumber: col.ticketNumber },
      update: {
        baseAmount: col.baseAmount,
        otherFeesPaid: col.otherFeesPaid,
        overdueFeePaid: col.overdueFeePaid,
        totalAmountPaid,
        paymentMethod: col.paymentMethod as any,
        status: col.status as any,
        remarks: col.remarks,
      },
      create: {
        stallId: targetStall.id,
        vendorId: targetStall.vendorId,
        collectorId: collectorUser.id,
        ticketNumber: col.ticketNumber,
        baseAmount: col.baseAmount,
        otherFeesPaid: col.otherFeesPaid,
        overdueFeePaid: col.overdueFeePaid,
        totalAmountPaid,
        paymentMethod: col.paymentMethod as any,
        status: col.status as any,
        remarks: col.remarks,
        collectedDate: col.collectedDate,
      },
    });
  }

  console.log("✨ All Market Stall Tables & Columns successfully seeded with sample data!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding Market Stall module:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
