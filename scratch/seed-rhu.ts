import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Rural Health Unit (RHU) transaction types...");

  const rhuServices = [
    {
      code: "RHU_HEALTH_CARD",
      name: "Health Certificate / Health Card",
      description: "Apply for a valid Health Certificate card required for food handlers, service workers, and business employees.",
      level: 1,
      category: "Rural Health Unit",
      baseFee: 100.00,
      deliveryFee: 50.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: [
        "Valid Government ID",
        "Chest X-ray Result (within 6 months)",
        "Stool Exam & Urine Exam (for food handlers)",
        "Barangay Clearance",
        "1x1 ID Picture (2 copies)"
      ],
      formSchema: {
        type: "RHU",
        serviceType: "HEALTH_CARD",
        fields: ["fullName", "age", "gender", "occupation", "employerName", "employerAddress"]
      },
      slaDays: 3,
      processorRole: UserRole.ADMIN_AIDE,
      pickupAddress: "Rural Health Unit (RHU) Office",
      processingTime: "1-2 Working Days",
      defaultFees: [
        { code: "HEALTH_CARD_FEE", label: "Health Card Issuance Fee", amount: 100.00 }
      ],
    },
    {
      code: "RHU_SANITARY_PERMIT",
      name: "Sanitary Permit / Inspection",
      description: "Request a sanitary inspection and secure a Sanitary Permit for business establishments.",
      level: 1,
      category: "Rural Health Unit",
      baseFee: 150.00,
      deliveryFee: 50.00,
      isFixed: true,
      requiresBusinessName: true,
      supportsECopy: true,
      requiredDocs: [
        "Valid Government ID of Owner",
        "Barangay Business Clearance",
        "Health Cards of all Employees",
        "DTI / SEC Registration"
      ],
      formSchema: {
        type: "RHU",
        serviceType: "SANITARY_PERMIT",
        fields: ["businessName", "ownerName", "businessAddress", "businessCategory", "employeeCount"]
      },
      slaDays: 3,
      processorRole: UserRole.ADMIN_AIDE,
      pickupAddress: "Rural Health Unit (RHU) Office",
      processingTime: "2-3 Working Days",
      defaultFees: [
        { code: "SANITARY_PERMIT_FEE", label: "Sanitary Inspection & Permit Fee", amount: 150.00 }
      ],
    },
    {
      code: "RHU_MEDICAL_CERT",
      name: "Medical Certificate / Clearance",
      description: "Request a medical certificate or clinical clearance from the Rural Health Unit.",
      level: 1,
      category: "Rural Health Unit",
      baseFee: 50.00,
      deliveryFee: 50.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: [
        "Valid Government ID",
        "Barangay Clearance",
        "Purpose of Request (Employment / School / Sports / Travel)"
      ],
      formSchema: {
        type: "RHU",
        serviceType: "MEDICAL_CERT",
        fields: ["fullName", "age", "gender", "purpose", "findings"]
      },
      slaDays: 1,
      processorRole: UserRole.ADMIN_AIDE,
      pickupAddress: "Rural Health Unit (RHU) Office",
      processingTime: "1 Working Day",
      defaultFees: [
        { code: "MEDICAL_CERT_FEE", label: "Medical Certification Fee", amount: 50.00 }
      ],
    }
  ];

  for (const s of rhuServices) {
    const existing = await prisma.transactionType.findUnique({
      where: { code: s.code }
    });

    if (existing) {
      console.log(`⚠️ Transaction type ${s.code} already exists. Skipping.`);
      continue;
    }

    await prisma.transactionType.create({
      data: {
        code: s.code,
        name: s.name,
        description: s.description,
        level: s.level,
        category: s.category,
        baseFee: s.baseFee,
        deliveryFee: s.deliveryFee,
        isFixed: s.isFixed,
        requiresBusinessName: s.requiresBusinessName,
        supportsECopy: s.supportsECopy,
        requiredDocs: JSON.stringify(s.requiredDocs) as any,
        formSchema: JSON.stringify(s.formSchema) as any,
        slaDays: s.slaDays,
        processorRole: s.processorRole,
        pickupAddress: s.pickupAddress,
        processingTime: s.processingTime,
        defaultFees: JSON.stringify(s.defaultFees) as any,
        isActive: true,
      }
    });
    console.log(`✅ Created transaction type ${s.code}`);
  }

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
