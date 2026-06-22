import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database seeding & restoration...");

  // 1. CLEANUP PREVIOUS DATA
  console.log("🧹 Cleaning up existing database records...");

  // Delete records in reverse dependency order
  await prisma.cedula.deleteMany({});
  await prisma.businessPermit.deleteMany({});
  await prisma.birthCertificateRequest.deleteMany({});
  await prisma.birthCertificateRegistry.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.resident.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.barangayInfo.deleteMany({});
  await prisma.transactionType.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.heroSlide.deleteMany({});

  console.log("✨ Cleanup completed successfully! Database is now at zero.");

  // 2. SEED SYSTEM SETTINGS
  console.log("⚙️ Seeding default System Settings...");
  const settings = [
    { key: "maintenance_mode", value: "false", description: "Toggle landing page maintenance mode" },
    { key: "kiosk_maintenance_mode", value: "false", description: "Toggle kiosk maintenance mode" },
    { key: "brand_word_1", value: "E", description: "First part of the system brand name" },
    { key: "brand_word_2", value: "Mapandan", description: "Second part of the system brand name" },
    { key: "theme_color", value: "#2563eb", description: "Primary branding theme color (Hex)" },
    { key: "site_logo", value: "", description: "URL to the system navigation logo" },

    // Landing Page Sections visibility
    { key: "section_dining_lodging", value: "true", description: "Toggle Dining and Lodging section" },
    { key: "section_places_to_visit", value: "true", description: "Toggle Tourism Spots / Gallery section" },
    { key: "section_events", value: "true", description: "Toggle Events section" },
    { key: "section_announcements", value: "true", description: "Toggle News / Announcements section" },
    { key: "section_lgu_projects", value: "true", description: "Toggle LGU Projects section" },
    { key: "section_jobs", value: "true", description: "Toggle Jobs section" },
    { key: "section_government", value: "true", description: "Toggle Municipal Officials section" },
    { key: "section_services", value: "true", description: "Toggle Services / Transaction types section" },
    { key: "section_emergency", value: "true", description: "Toggle Emergency Hotlines section" },
    { key: "section_church", value: "true", description: "Toggle Parish Corner section" },
    { key: "section_map", value: "true", description: "Toggle Interactive Municipality Map section" },
    { key: "section_app_download", value: "true", description: "Toggle App Download Section" },

    // Mobile App Links
    { key: "app_google_play_url", value: "", description: "Google Play Store Link for Mobile App" },
    { key: "app_app_store_url", value: "", description: "Apple App Store Link for Mobile App" },
    { key: "app_apk_download_url", value: "", description: "Direct APK Link for Mobile App" },

    // Treasury Details
    { key: "gcash_account_name", value: "MUNICIPALITY OF MAPANDAN", description: "Official GCash receiver name" },
    { key: "gcash_account_number", value: "0917-123-4567", description: "Official GCash number" },
    { key: "gcash_qr_url", value: "", description: "URL to GCash payment QR image" },
    { key: "bank_name", value: "LANDBANK OF THE PHILIPPINES", description: "Official bank partner name" },
    { key: "bank_account_name", value: "MUNICIPALITY OF MAPANDAN", description: "Official bank account name" },
    { key: "bank_account_number", value: "0541-2345-67", description: "Official bank account number" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log(`✅ Seeded ${settings.length} system setting parameters.`);

  // 3. SEED BARANGAY INFORMATION
  console.log("🏡 Seeding official Mapandan Barangays with logistics configurations...");
  const barangays = [
    "Amanoaoac", "Apaya", "Aserda", "Baloling", "Coral", "Golden", "Jimenez",
    "Lambayan", "Luyan South", "Nilombot", "Pias", "Poblacion", "Primicias",
    "Sta. Maria", "Torres"
  ];

  for (const name of barangays) {
    await prisma.barangayInfo.create({
      data: {
        name,
        description: `Barangay ${name} in the municipality of Mapandan, Pangasinan.`,
        deliveryFee: 50.00,
        isLogisticsActive: true,
        estimatedDeliveryDays: 3,
        coverImages: "[]",
      }
    });
  }
  console.log(`✅ Seeded ${barangays.length} official barangays.`);

  // 4. SEED TRANSACTION TYPES (9 OFFICIAL SERVICES)
  console.log("📋 Seeding official municipal service Transaction Types...");
  const types = [
    {
      code: "CEDULA_IND",
      name: "Community Tax Certificate - Individual",
      description: "Tax certificate for individuals including employees, self-employed, and property owners.",
      level: 1,
      category: "Treasurer",
      baseFee: 5.00,
      deliveryFee: 50.00,
      isFixed: false,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: ["Valid Government ID", "Proof of Income (Payslip/BIR 2316)"],
      formSchema: {
        applicantType: "INDIVIDUAL",
        fields: ["income", "propertyValue"]
      },
      logicCode: "cedula_calc_v1",
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "CEDULA_JUR",
      name: "Community Tax Certificate - Juridical",
      description: "Tax certificate for corporations, partnerships, and other juridical entities.",
      level: 1,
      category: "Treasurer",
      baseFee: 500.00,
      deliveryFee: 50.00,
      isFixed: false,
      requiresBusinessName: true,
      supportsECopy: true,
      requiredDocs: ["Valid ID of Representative", "Business Income Statement"],
      formSchema: {
        applicantType: "JURIDICAL",
        fields: ["businessName", "income", "propertyValue"]
      },
      logicCode: "cedula_calc_v1",
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "BUSINESS_PERMIT_NEW",
      name: "Business Permit - New",
      description: "Apply for a new business permit for starting a business in Mapandan, Pangasinan.",
      level: 1,
      category: "Permits",
      baseFee: 500.00,
      deliveryFee: 100.00,
      isFixed: false,
      requiresBusinessName: true,
      supportsECopy: true,
      requiredDocs: [
        "Unified Form Community Tax Certificate (CTC)",
        "DTI/SEC/CDA Registration",
        "Barangay Clearance",
        "Valid ID of Business Owner",
        "Photo of Business Location",
        "Sanitary Permit",
        "Fire Safety Inspection Certificate"
      ],
      formSchema: {
        businessType: "NEW",
        fields: ["businessName", "tradeName", "orgType", "dtiSecNumber", "lineOfBusiness", "capitalInvestment", "employeeCount", "businessArea"]
      },
      logicCode: "business_permit_calc_v1",
      slaDays: 5,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "BUSINESS_PERMIT_RENEW",
      name: "Business Permit - Renewal",
      description: "Renew your existing business permit. Calculated based on previous annual gross sales.",
      level: 1,
      category: "Permits",
      baseFee: 500.00,
      deliveryFee: 100.00,
      isFixed: false,
      requiresBusinessName: true,
      supportsECopy: true,
      requiredDocs: [
        "Unified Form Community Tax Certificate (CTC)",
        "DTI/SEC/CDA Registration",
        "Barangay Clearance",
        "Valid ID of Business Owner",
        "Photo of Business Location",
        "Sanitary Permit",
        "Fire Safety Inspection Certificate"
      ],
      formSchema: {
        businessType: "RENEWAL",
        fields: ["businessName", "tradeName", "orgType", "permitNumber", "lineOfBusiness", "grossSales", "employeeCount", "businessArea"]
      },
      logicCode: "business_permit_calc_v1",
      slaDays: 5,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "LCR_BIRTH",
      name: "Birth Certificate (Certified Copy)",
      description: "Request for a certified true copy of a birth certificate from the Local Civil Registry.",
      level: 1,
      category: "Civil Registry",
      baseFee: 150.00,
      deliveryFee: 100.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: ["Valid ID of Applicant", "Authorization Letter (if not owner)"],
      formSchema: {
        type: "CIVIL_REGISTRY",
        registryType: "BIRTH",
        fields: ["fullName", "dateOfBirth", "placeOfBirth", "fathersName", "mothersName"]
      },
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "LCR_BIRTH_REG",
      name: "Birth Registration (New Record)",
      description: "Register a new birth record with the Local Civil Registry.",
      level: 1,
      category: "Civil Registry",
      baseFee: 100.00,
      deliveryFee: 100.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: ["Certificate of Live Birth", "Marriage Certificate of Parents", "Valid ID of Informant"],
      formSchema: {
        type: "CIVIL_REGISTRY",
        registryType: "BIRTH_REG",
        fields: ["fullName", "dateOfBirth", "placeOfBirth", "fathersName", "mothersName"]
      },
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
      defaultFees: [
        { code: "PROCESSING_FEE", label: "Processing & E-Copy Fee", amount: 215.00 },
        { code: "LATE_FEE_1_10", label: "Late Fee (1-10 Years)", amount: 315.00 },
        { code: "LATE_FEE_10_20", label: "Late Fee (10-20 Years)", amount: 515.00 },
        { code: "LATE_FEE_20_UP", label: "Late Fee (20+ Years)", amount: 1015.00 }
      ]
    },
    {
      code: "LCR_MARRIAGE",
      name: "Marriage Certificate (Certified Copy)",
      description: "Request for a certified true copy of a marriage certificate from the Local Civil Registry.",
      level: 1,
      category: "Civil Registry",
      baseFee: 150.00,
      deliveryFee: 100.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: ["Valid ID of Applicant", "Authorization Letter (if not owner)"],
      formSchema: {
        type: "CIVIL_REGISTRY",
        registryType: "MARRIAGE",
        fields: ["husbandName", "wifeName", "dateOfMarriage", "placeOfMarriage"]
      },
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "LCR_DEATH",
      name: "Death Certificate (Certified Copy)",
      description: "Request for a certified true copy of a death certificate from the Local Civil Registry.",
      level: 1,
      category: "Civil Registry",
      baseFee: 150.00,
      deliveryFee: 100.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: ["Valid ID of Applicant"],
      formSchema: {
        type: "CIVIL_REGISTRY",
        registryType: "DEATH",
        fields: ["deceasedName", "dateOfDeath", "placeOfDeath"]
      },
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
    },
    {
      code: "LCR_DEATH_REG",
      name: "Death Registration (New Record)",
      description: "Register a new death record with the Local Civil Registry.",
      level: 1,
      category: "Civil Registry",
      baseFee: 0.00,
      deliveryFee: 100.00,
      isFixed: true,
      requiresBusinessName: false,
      supportsECopy: true,
      requiredDocs: ["Municipal Form No. 103", "Valid ID of Informant"],
      formSchema: {
        type: "CIVIL_REGISTRY",
        registryType: "DEATH_REG",
        fields: ["fullName", "dateOfBirth", "dateOfDeath", "placeOfDeath", "causeOfDeath", "gender", "civilStatus", "fathersName", "mothersName"]
      },
      slaDays: 3,
      processorRole: UserRole.TREASURY_STAFF,
      lateFee: 300.00,
    }
  ];

  for (const t of types) {
    await prisma.transactionType.create({
      data: {
        ...t,
        requiredDocs: JSON.stringify(t.requiredDocs) as any,
        formSchema: JSON.stringify(t.formSchema) as any,
      }
    });
  }
  console.log(`✅ Seeded ${types.length} core transaction services.`);

  // 5. SEED HOME SHOWCASE HERO SLIDE
  console.log("🖼️ Seeding Hero Slide for homepage banner...");
  await prisma.heroSlide.create({
    data: {
      title: "Welcome to E-Mapandan",
      subtitle: "Your digital gateway to municipal services, tourism, and community events.",
      tagline: "Fast, Reliable, Secure",
      imageUrl: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=1200",
      order: 0,
      isActive: true,
      primaryBtnText: "OUR SERVICES",
      primaryBtnLink: "#services",
      secondaryBtnText: "ABOUT US",
      secondaryBtnLink: "/about",
    }
  });
  console.log("✅ Seeded showcase Hero Slide.");

  // 6. SEED USERS & MOCK ROLES
  console.log("👥 Creating administrative and user test accounts...");

  const saltRounds = 10;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || "password123";
  const commonHashedPassword = await bcrypt.hash(seedPassword, saltRounds);

  const mockUsers = [
    {
      name: "Municipal Admin",
      email: "admin@mapandan.gov.ph",
      password: commonHashedPassword,
      role: "ADMIN" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Treasury Staff",
      email: "treasury@mapandan.gov.ph",
      password: commonHashedPassword,
      role: "TREASURY_STAFF" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Admin Aide",
      email: "aide@mapandan.gov.ph",
      password: commonHashedPassword,
      role: "ADMIN_AIDE" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Logistics Rider",
      email: "jhma.nilo.up@phinmaed.com",
      password: commonHashedPassword,
      role: "RIDER" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    }
  ];

  for (const u of mockUsers) {
    await prisma.user.create({ data: u });
  }

  // 7. SEED CITIZEN & RESIDENT RELATION
  console.log("👤 Creating verified citizen user and resident profile link...");
  const citizen = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "citizen@gmail.com",
      password: commonHashedPassword,
      role: "USER",
      isEmailVerified: true,
      emailVerified: new Date(),
    }
  });

  await prisma.resident.create({
    data: {
      userId: citizen.id,
      firstName: "John",
      lastName: "Doe",
      middleName: "Smith",
      gender: "Male",
      dateOfBirth: new Date("1995-05-15"),
      placeOfBirth: "Mapandan, Pangasinan",
      civilStatus: "Single",
      citizenship: "Filipino",
      purok: "Purok 1",
      street: "Rizal Street",
      barangay: "Poblacion",
      contactNumber: "0917-888-8888",
      email: "citizen@gmail.com",
      registrationStatus: "APPROVED", // Approved bypasses pre-screening!
      registrationType: "SELF",
      dataPrivacyConsent: true,
      consentTimestamp: new Date(),
    }
  });

  console.log("🎉 Database seeding completed successfully! Ready for actions.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
