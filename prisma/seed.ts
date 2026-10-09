import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import lguConfig from "../config/lgu.config.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database seeding & restoration...");

  // 1. CLEANUP PREVIOUS DATA
  console.log("🧹 Cleaning up existing database records...");

  // Delete records in reverse dependency order
  const safeDelete = async (fn: () => Promise<any>) => { try { await fn(); } catch (_) {} };
  await safeDelete(() => (prisma as any).tourismSpot?.deleteMany({}));
  await safeDelete(() => (prisma as any).diningLodging?.deleteMany({}));
  await safeDelete(() => (prisma as any).event?.deleteMany({}));
  await safeDelete(() => (prisma as any).announcement?.deleteMany({}));
  await safeDelete(() => (prisma as any).project?.deleteMany({}));
  await safeDelete(() => (prisma as any).jobPosting?.deleteMany({}));
  await safeDelete(() => (prisma as any).hotline?.deleteMany({}));
  await safeDelete(() => (prisma as any).stallCollection?.deleteMany({}));
  await safeDelete(() => (prisma as any).stallLease?.deleteMany({}));
  await safeDelete(() => (prisma as any).marketStall?.deleteMany({}));
  await safeDelete(() => (prisma as any).impoundedVehicle?.deleteMany({}));
  await safeDelete(() => prisma.official.deleteMany({}));
  await safeDelete(() => prisma.cedula.deleteMany({}));
  await safeDelete(() => prisma.businessPermit.deleteMany({}));
  await safeDelete(() => prisma.birthCertificateRequest.deleteMany({}));
  await safeDelete(() => prisma.birthCertificateRegistry.deleteMany({}));
  await safeDelete(() => prisma.transaction.deleteMany({}));
  // Resident records are operational data and must survive sample reseeding.
  await safeDelete(() => prisma.user.deleteMany({}));
  await safeDelete(() => prisma.barangayInfo.deleteMany({}));
  await safeDelete(() => prisma.transactionType.deleteMany({}));
  await safeDelete(() => prisma.systemSetting.deleteMany({}));
  await safeDelete(() => prisma.heroSlide.deleteMany({}));

  console.log("✨ Cleanup completed successfully! Database is now at zero.");

  // 2. SEED SYSTEM SETTINGS
  console.log("⚙️ Seeding default System Settings...");
  const settings = [
    { key: "maintenance_mode", value: "false", description: "Toggle landing page maintenance mode" },
    { key: "kiosk_maintenance_mode", value: "false", description: "Toggle kiosk maintenance mode" },
    { key: "brand_word_1", value: "E-", description: "First part of the system brand name" },
    { key: "brand_word_2", value: "LGU", description: "Second part of the system brand name" },
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
    { key: "gcash_account_name", value: lguConfig.payments.gcashAccountName, description: "Official GCash receiver name" },
    { key: "gcash_account_number", value: lguConfig.payments.gcashAccountNumber, description: "Official GCash number" },
    { key: "gcash_qr_url", value: "", description: "URL to GCash payment QR image" },
    { key: "bank_name", value: lguConfig.payments.bankName, description: "Official bank partner name" },
    { key: "bank_account_name", value: lguConfig.payments.bankAccountName, description: "Official bank account name" },
    { key: "bank_account_number", value: lguConfig.payments.bankAccountNumber, description: "Official bank account number" },

    // POSO Public Portal Settings
    { key: "poso_location", value: lguConfig.poso.address, description: "Official POSO Office Address" },
    { key: "poso_hotline", value: lguConfig.poso.hotline, description: "POSO Emergency & Incident Hotline Numbers" },
    { key: "poso_operating_hour", value: lguConfig.poso.officeHours, description: "POSO Office Operating Hours" },
    { key: "poso_official_email", value: lguConfig.poso.email, description: "POSO Official Public Contact Email" },
    { key: "poso_facebook", value: lguConfig.social.posoFacebook, description: "POSO Official Facebook Page Link" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log(`✅ Seeded ${settings.length} system setting parameters.`);

  // 3. SEED BARANGAY INFORMATION
  console.log("🏡 Seeding official Barangays with logistics configurations...");
  const barangays = lguConfig.barangays.filter((name) => !name.includes("{{"));

  for (const name of barangays) {
    await prisma.barangayInfo.create({
      data: {
        name,
        description: `Sample service area for ${name}.`,
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
      pickupAddress: "Treasury Office",
      processingTime: "20 Minutes",
      defaultFees: [
        { code: "BASIC_TAX", label: "Basic Community Tax", amount: 5.00 },
        { code: "INDIVIDUAL_TAX_RULE", label: "Individual - ₱5.00 + ₱1.00 for every ₱1,000.00 gross income from business, Profession or property but in no case shall exceed ₱5,000.00", amount: 0.00 }
      ],
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
      pickupAddress: "Treasury Office",
      processingTime: "20 Minutes",
      defaultFees: [
        { code: "BASIC_TAX", label: "Basic Community Tax", amount: 500.00 },
        { code: "JURIDICAL_TAX_RULE", label: "Juridical - ₱500.00 + ₱2.00 for every ₱5,000.00 gross income from business or worth of real property but in no case shall exceed ₱10,000.00", amount: 0.00 }
      ],
    },
    {
      code: "BUSINESS_PERMIT_NEW",
      name: "Business Permit - New",
      description: "Apply for a new business permit for starting a business in the Municipality of E-LGU.",
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
      pickupAddress: "BPLO Office",
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
      pickupAddress: "BPLO Office",
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
      pickupAddress: "Local Civil Registry (LCR) Office",
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
      ],
      pickupAddress: "Local Civil Registry (LCR) Office",
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
      pickupAddress: "Local Civil Registry (LCR) Office",
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
      pickupAddress: "Local Civil Registry (LCR) Office",
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
      pickupAddress: "Local Civil Registry (LCR) Office",
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
      title: "Welcome to E-LGU",
      subtitle: "Your digital gateway to municipal services, tourism, and community events.",
      tagline: "Fast, Reliable, Secure",
      imageUrl: "/images/municipality-digital-services.webp",
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
      email: lguConfig.seedAccounts.adminEmail,
      password: commonHashedPassword,
      role: "ADMIN" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Treasury Staff",
      email: lguConfig.seedAccounts.treasuryEmail,
      password: commonHashedPassword,
      role: "TREASURY_STAFF" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Admin Aide",
      email: lguConfig.seedAccounts.adminAideEmail,
      password: commonHashedPassword,
      role: "ADMIN_AIDE" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Logistics Rider",
      email: lguConfig.seedAccounts.riderEmail,
      password: commonHashedPassword,
      role: "RIDER" as const,
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "RHU Administrator",
      email: lguConfig.seedAccounts.rhuEmail,
      password: commonHashedPassword,
      role: "ADMIN" as const,
      department: "RHU",
      isEmailVerified: true,
      emailVerified: new Date(),
    },
    {
      name: "Municipal Assessor Admin",
      email: lguConfig.seedAccounts.assessorEmail,
      password: commonHashedPassword,
      role: "ASSESSOR" as any,
      department: "ASSESSOR",
      isEmailVerified: true,
      emailVerified: new Date(),
      isPasswordChanged: true,
    },
    {
      name: "MDRRMO Administrator",
      email: lguConfig.seedAccounts.disasterResponseEmail,
      password: commonHashedPassword,
      role: "MDRRMO_ADMIN" as any,
      department: "MDRRMO",
      isEmailVerified: true,
      emailVerified: new Date(),
    }
  ];

  for (const u of mockUsers) {
    if (!u.email) continue;
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
  }

  // 7. SEED CITIZEN & RESIDENT RELATION
  console.log("👤 Creating verified citizen user and resident profile link...");
  const citizen = await prisma.user.upsert({
    where: { email: lguConfig.seedAccounts.residentEmail },
    update: {},
    create: {
      name: "John Doe",
      email: lguConfig.seedAccounts.residentEmail,
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
      placeOfBirth: lguConfig.identity.fullName,
      municipality: lguConfig.identity.name,
      province: lguConfig.identity.province,
      civilStatus: "Single",
      citizenship: "Filipino",
      purok: "Purok 1",
      street: "Rizal Street",
      barangay: lguConfig.barangays.find((name) => !name.includes("{{")) || "{{BARANGAY_NAME}}",
      contactNumber: lguConfig.contact.phone,
      email: lguConfig.contact.email,
      registrationStatus: "APPROVED", // Approved bypasses pre-screening!
      registrationType: "SELF",
      dataPrivacyConsent: true,
      consentTimestamp: new Date(),
    }
  });

  // 6. SEED MUNICIPAL OFFICIALS
  console.log("🏛️ Seeding official Municipal Leadership & Council Members...");
  const initialOfficials = [
    {
      name: "Hon. Roberto 'Bert' S. Garcia",
      position: "Municipal Mayor",
      imageUrl: "/images/officials/mayor.png",
      category: "LGU",
      order: 1,
      bio: "Dedicated public servant committed to transparent governance, digital transformation, and sustainable community development.",
      motto: "Serbisyo nang May Tapat na Puso",
      achievements: "Master in Public Administration (UP Diliman), Digital LGU Leadership Award 2024",
      education: "Bachelor of Science in Political Science, UP Diliman",
      email: "mayor@lgu.gov.ph",
      contactNumber: "+63 917 123 4567"
    },
    {
      name: "Hon. Antonio R. Mendoza",
      position: "Municipal Vice Mayor",
      imageUrl: "/images/officials/vice-mayor.png",
      category: "LGU",
      order: 2,
      bio: "Presiding Officer of the Sangguniang Bayan, advocating for youth empowerment, education, and economic legislation.",
      motto: "Mataas na Kalidad ng Batas para sa Mamamayan",
      achievements: "Passage of the Municipal Youth Development & Digital Governance Code",
      education: "Juris Doctor, Ateneo de Manila Law School",
      email: "vicemayor@lgu.gov.ph",
      contactNumber: "+63 917 123 4568"
    },
    {
      name: "Hon. Juanito 'Juan' P. Dela Cruz",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-1.png",
      category: "LGU",
      order: 3,
      bio: "Chairperson, Committee on Finance, Budget, and Appropriations.",
      motto: "Tapat at Matalinong Paggamit ng Pondo ng Bayan",
    },
    {
      name: "Hon. Carmen L. Reyes",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-2.png",
      category: "LGU",
      order: 4,
      bio: "Chairperson, Committee on Health, Sanitation, and Social Services.",
      motto: "Kalusugan at Kalinga sa Bawat Pamilya",
    },
    {
      name: "Hon. Elena M. Ramos",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-3.jpg",
      category: "LGU",
      order: 5,
      bio: "Chairperson, Committee on Education, Culture, and the Arts.",
      motto: "Edukasyon ang Susi sa Maunlad na Bukas",
    },
    {
      name: "Hon. Dr. Victoria C. Alcantara",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-4.jpg",
      category: "LGU",
      order: 6,
      bio: "Chairperson, Committee on Environment and Natural Resources.",
      motto: "Luntiang Kapaligiran, Ligtas na Pamayanan",
    },
    {
      name: "Hon. Corazon 'Cora' B. Aquino-Villanueva",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-5.jpg",
      category: "LGU",
      order: 7,
      bio: "Chairperson, Committee on Tourism, Trade, and Agriculture.",
      motto: "Kasaganaan sa Bukid at Negosyo",
    },
    {
      name: "Hon. Alejandro 'Alex' T. Bautista",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-6.jpg",
      category: "LGU",
      order: 8,
      bio: "Chairperson, Committee on Peace and Order, Public Safety, and MDRRMO.",
      motto: "Kapayapaan at Kaayusan sa Bawat Sulok ng Bayan",
    },
    {
      name: "Hon. Ramon 'Mon' G. Fernandez",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-7.png",
      category: "LGU",
      order: 9,
      bio: "Chairperson, Committee on Economic Enterprise and Market Logistics.",
      motto: "Umunlad na Pamilihan, Masiglang Ekonomiya",
    },
    {
      name: "Hon. Fernando 'Nando' D. Castro",
      position: "Sangguniang Bayan Member",
      imageUrl: "/images/officials/councilor-9.png",
      category: "LGU",
      order: 10,
      bio: "Chairperson, Committee on Transportation and Public Utilities.",
      motto: "Ligtas at Maayos na Byahe para sa Lahat",
    },
    {
      name: "Hon. Rodolfo C. Dela Cruz",
      position: "LnB President / Ex-Officio Member",
      imageUrl: "/images/officials/lnb-president.png",
      category: "LGU",
      order: 11,
      bio: "President, Liga ng mga Barangay. Championing barangay autonomy and local community welfare.",
      motto: "Pagkakaisa ng mga Barangay para sa Sambayanan",
    },
    {
      name: "Hon. Gabriel 'Gabi' K. Navarro",
      position: "SK Federation President / Ex-Officio Member",
      imageUrl: "/images/officials/sk-president.png",
      category: "LGU",
      order: 12,
      bio: "President, Sangguniang Kabataan Federation. Empowering young leaders and sports development.",
      motto: "Kabataan ang Pag-asa at Lakas ng Bayan",
    },
  ];

  for (const off of initialOfficials) {
    await prisma.official.create({ data: off });
  }
  console.log(`✅ Seeded ${initialOfficials.length} municipal officials.`);

  // 7. SEED HERO CAROUSEL SLIDES
  console.log("🖼️ Seeding Hero Carousel Slides...");
  const sampleSlides = [
    {
      title: "Empowering Citizens Through Digital Governance",
      tagline: "Welcome to the Official E-LGU Portal",
      imageUrl: "/images/lgu-seal-full.jpg",
      primaryBtnText: "Explore Online Services",
      primaryBtnLink: "#services",
      secondaryBtnText: "Municipal Leadership",
      secondaryBtnLink: "#leadership",
      order: 1,
      isActive: true,
    },
    {
      title: "Fast, Transparent & Efficient Public Services",
      tagline: "Local Government Unit Services",
      imageUrl: "/images/lgu-logo.png",
      primaryBtnText: "Apply for Permits",
      primaryBtnLink: "/user/services",
      secondaryBtnText: "Track Applications",
      secondaryBtnLink: "/user/services/requests",
      order: 2,
      isActive: true,
    },
    {
      title: "24/7 Civic Safety & Emergency Response",
      tagline: "Public Order & Disaster Preparedness",
      imageUrl: "/images/lgu-seal-full.jpg",
      primaryBtnText: "Report Emergency",
      primaryBtnLink: "#emergency",
      secondaryBtnText: "Emergency Hotlines",
      secondaryBtnLink: "#emergency",
      order: 3,
      isActive: true,
    },
  ];
  for (const slide of sampleSlides) {
    await prisma.heroSlide.create({ data: slide });
  }
  console.log(`✅ Seeded ${sampleSlides.length} hero slides.`);

  // 8. SEED EMERGENCY HOTLINES
  console.log("📞 Seeding Emergency Hotlines...");
  const sampleHotlines = [
    {
      name: "MDRRMO Rescue & Emergency Response",
      mobileNumber: lguConfig.contact.hotlines.disasterResponse,
      category: "DISASTER",
    },
    {
      name: "Municipal Police Station",
      mobileNumber: lguConfig.contact.hotlines.police,
      category: "POLICE",
    },
    {
      name: "Bureau of Fire Protection",
      mobileNumber: lguConfig.contact.hotlines.fire,
      category: "FIRE",
    },
    {
      name: "Rural Health Unit / Medical Ambulance",
      mobileNumber: lguConfig.contact.hotlines.health,
      category: "HEALTH",
    },
  ];
  for (const h of sampleHotlines) {
    await (prisma as any).hotline?.create({ data: h });
  }
  console.log(`✅ Seeded emergency hotlines.`);

  // 9. SEED ANNOUNCEMENTS & EVENTS
  console.log("📢 Seeding Public Advisories & Events...");
  try {
    await (prisma as any).announcement?.create({
      data: {
        title: "Launch of the E-LGU Digital Citizen Portal",
        content: "Citizens can now apply for business permits, cedula, civil registry documents, and track transactions online 24/7.",
        category: "GENERAL",
        priority: "HIGH",
        isPinned: true,
        isActive: true,
      }
    });
    await (prisma as any).event?.create({
      data: {
        title: "Annual Municipal Town Hall & Citizen Assembly",
        description: "Open forum with municipal leaders, budget presentation, and community consultation.",
        venueName: "Municipal Gymnasium & Civic Center",
        address: "Poblacion",
        category: "COMMUNITY",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPublished: true,
      }
    });

    // Keep the sample story idempotent so rerunning the seed cannot duplicate it.
    const sampleNews = {
      title: "Municipal Government Enhances Public Services with Digital Portal",
      content: "Citizens can now access key municipal services, request certificates, and track application status online through the new E-LGU Portal.",
      category: "GOVERNMENT",
      author: "Municipal Information Office",
      imageUrl: "/images/municipality-digital-services-news.webp",
      isPublished: true,
    };
    const existingSampleNews = await prisma.news.findFirst({
      where: {
        title: sampleNews.title,
        content: sampleNews.content,
        category: sampleNews.category,
        author: sampleNews.author,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingSampleNews) {
      await prisma.news.update({
        where: { id: existingSampleNews.id },
        data: { ...sampleNews, publishDate: new Date() },
      });
    } else {
      await prisma.news.create({ data: sampleNews });
    }
  } catch (e) {
    console.log("Noted event/announcement seed error:", e);
  }

  // 10. SEED LGU PROJECTS & JOBS
  console.log("🏗️ Seeding LGU Projects & Job Openings...");
  try {
    const sampleProjects = [
      {
        title: "Municipal Digital Infrastructure & Fiber Connectivity",
        description: "High-speed network linking all barangay halls, health centers, and disaster command posts.",
        category: "INFRASTRUCTURE",
        location: "Townwide",
        imageUrl: "/images/projects/fiber-connectivity.webp",
        status: "ONGOING",
        budget: "₱15,000,000.00",
        startDate: new Date("2025-01-15"),
        progress: 75,
        isPublished: true,
      },
      {
        title: "Modernized Multi-Purpose Evacuation & Civic Center",
        description: "Resilient community hall equipped with emergency shelters, solar power backup, and medical triage facilities.",
        category: "CIVIC WORKS",
        location: "Barangay Poblacion",
        imageUrl: "/images/projects/evacuation-civic-center.webp",
        status: "ONGOING",
        budget: "₱28,500,000.00",
        progress: 60,
        isPublished: true,
      },
      {
        title: "Solar-Powered Street Lighting & Civic Safety Network",
        description: "Installation of smart solar streetlights along primary thoroughfares and barangay roads for public safety.",
        category: "PUBLIC SAFETY",
        location: "Major Municipal Corridors",
        imageUrl: "/images/projects/solar-street-lighting.webp",
        status: "COMPLETED",
        budget: "₱12,200,000.00",
        progress: 100,
        isPublished: true,
      },
    ];

    for (const projData of sampleProjects) {
      const existing = await (prisma as any).project?.findFirst({
        where: { title: projData.title }
      });
      if (existing) {
        await (prisma as any).project?.update({
          where: { id: existing.id },
          data: projData
        });
      } else {
        await (prisma as any).project?.create({
          data: projData
        });
      }
    }
    await (prisma as any).job?.create({
      data: {
        title: "Administrative Aide VI - Treasury Department",
        department: "Municipal Treasury",
        description: "Assists in processing revenue collections, online receipt verification, and front desk operations.",
        qualifications: "Civil Service Sub-Professional Eligible",
        requirements: "Personal Data Sheet (CS Form 212), Official Transcript of Records",
        employmentType: "PERMANENT",
        isActive: true,
      }
    });

    // Seed Places to Visit & Dining/Lodging
    await (prisma as any).tourismSpot?.create({
      data: {
        name: "Municipal Eco-Park & Town Plaza",
        category: "Park & Recreation",
        description: "Community eco-park featuring landscaped gardens, walking trails, and public outdoor space.",
        address: "Poblacion",
        imageUrl: "/images/discovery/eco-park-town-plaza.webp",
        isPublished: true,
      }
    });

    await (prisma as any).dining?.create({
      data: {
        name: "Municipal Heritage Cafe",
        description: "Local dining hub offering traditional cuisine and fresh native delicacies.",
        address: "Poblacion",
        imageUrl: "/images/discovery/dining-cafe-interior.webp",
        cuisineType: "Filipino",
        isPublished: true,
      }
    });

    await (prisma as any).accommodation?.create({
      data: {
        name: "Township Executive Lodge",
        description: "Comfortable municipal lodging accommodations for guests and visiting dignitaries.",
        address: "Poblacion",
        imageUrl: "/images/discovery/lodge-bedroom.webp",
        type: "Inn / Lodge",
        priceRange: "₱1,200 - ₱2,500",
        isPublished: true,
      }
    });
    // Keep the sample documents clearly labeled and update them instead of duplicating them.
    const sampleLegislativeDocuments = [
      {
        type: "ORDINANCE",
        referenceNumber: "SAMPLE-ORD-001",
        title: "[SAMPLE] Barangay Connectivity and Digital Services Ordinance",
        description: "Illustrative sample only: a proposed measure about expanding digital access and online municipal services. This is not an enacted ordinance and has no legal effect.",
        tags: ["SAMPLE", "DIGITAL GOVERNANCE", "PUBLIC SERVICE"],
        dateApproved: new Date("2025-01-10"),
        status: "SAMPLE",
        pdfUrl: null,
        barangay: null,
      },
      {
        type: "RESOLUTION",
        referenceNumber: "SAMPLE-RES-001",
        title: "[SAMPLE] Resolution Supporting Community Development Planning",
        description: "Illustrative sample only: a resolution-style example about community planning priorities. This is not an adopted resolution and has no legal effect.",
        tags: ["SAMPLE", "PLANNING", "DEVELOPMENT"],
        dateApproved: new Date("2025-02-15"),
        status: "SAMPLE",
        pdfUrl: null,
        barangay: null,
      },
    ];

    const sampleLegislativeDocumentIds: string[] = [];

    for (const document of sampleLegislativeDocuments) {
      const existing = await prisma.legislativeDocument.findFirst({
        where: { referenceNumber: document.referenceNumber },
        orderBy: { createdAt: "asc" },
      });

      if (existing) {
        const updated = await prisma.legislativeDocument.update({
          where: { id: existing.id },
          data: document,
        });
        sampleLegislativeDocumentIds.push(updated.id);
      } else {
        const created = await prisma.legislativeDocument.create({ data: document });
        sampleLegislativeDocumentIds.push(created.id);
      }
    }

    await prisma.legislativeDocument.deleteMany({
      where: {
        referenceNumber: { in: sampleLegislativeDocuments.map(document => document.referenceNumber) },
        id: { notIn: sampleLegislativeDocumentIds },
      },
    });

    await prisma.legislativeDocument.deleteMany({
      where: {
        referenceNumber: "{{LEGISLATIVE_REFERENCE_NUMBER}}",
        title: "{{LEGISLATIVE_DOCUMENT_TITLE}}",
        status: "TEMPLATE",
      },
    });

  } catch (e) {
    console.log("Noted project/job/legislative seed error:", e);
  }

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
