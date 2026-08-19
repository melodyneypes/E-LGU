import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const samples = [
  {
    type: "ORDINANCE",
    referenceNumber: "Municipal Ordinance No. 2026-003",
    title: "Sustainable Practices & Single-Use Plastic Reduction Ordinance of 2026",
    description: "Restricts single-use plastics in all business establishments (retail, eateries, public markets). Imposes tiered fines and penalties for violations. Encourages alternatives.",
    tags: ["ENVIRONMENT", "HEALTH & SANITATION"],
    dateApproved: new Date("2026-08-12T00:00:00Z"),
    status: "ACTIVE / ENFORCED",
  },
  {
    type: "ORDINANCE",
    referenceNumber: "Municipal Ordinance No. 2025-010",
    title: "Mapandan General Curfew Ordinance for Minors",
    description: "Establishes a 10:00 PM to 4:00 AM curfew for minors (under 18) for public safety. Fines for repeating parental violations. Exceptions for work/emergencies.",
    tags: ["PUBLIC SAFETY", "YOUTH DEVELOPMENT"],
    dateApproved: new Date("2025-11-18T00:00:00Z"),
    status: "ACTIVE / ENFORCED",
  },
  {
    type: "RESOLUTION",
    referenceNumber: "Sangguniang Bayan Resolution No. 2026-145",
    title: "A Resolution Authorizing the Municipal Mayor to Enter into a DPWH Agreement for the Central Water Supply Project",
    description: "Grants Mayor authority to sign MOA for infrastructure funding for Poblacion water system upgrades. Immediate high-priority implementation.",
    tags: ["INFRA & PUBLIC WORKS", "WATER SERVICES"],
    dateApproved: new Date("2026-08-17T00:00:00Z"),
    status: "ADOPTED / IMPLEMENTATION PENDING",
  },
  {
    type: "RESOLUTION",
    referenceNumber: "Sangguniang Bayan Resolution No. 2026-098",
    title: "A Resolution Commending the Mapandan National High School Robotics Team Championship & Declaring 'Youth Achievers Day'",
    description: "Official commendation for robotics team's national championship. Designates [Mock Date] as 'Youth Achievers Day' annually.",
    tags: ["EDUCATION", "YOUTH RECOGNITION"],
    dateApproved: new Date("2026-06-24T00:00:00Z"),
    status: "ADOPTED / CEREMONIAL",
  },
  {
    type: "ORDINANCE",
    referenceNumber: "Municipal Ordinance No. 2026-005",
    title: "Comprehensive Solid Waste Management and Anti-Littering Ordinance of 2026",
    description: "Requires segregation at source, schedules collection, and prohibits littering in all public places. Establishes community service penalties.",
    tags: ["ENVIRONMENT", "HEALTH & SANITATION", "WASTE MANAGEMENT"],
    dateApproved: new Date("2026-09-01T00:00:00Z"),
    status: "ACTIVE / ENFORCED",
  },
  {
    type: "ORDINANCE",
    referenceNumber: "Municipal Ordinance No. 2026-008",
    title: "Mapandan Municipal Ordinance Granting Benefits and Incentives to Barangay Health Workers (BHWs)",
    description: "Provides medical subsidy, insurance protection, and loyalty bonuses to active volunteers servicing municipal health clinics.",
    tags: ["HEALTH & SANITATION", "BENEFITS", "BARANGAY SUPPORT"],
    dateApproved: new Date("2026-09-10T00:00:00Z"),
    status: "ACTIVE / ENFORCED",
  },
  {
    type: "ORDINANCE",
    referenceNumber: "Municipal Ordinance No. 2026-012",
    title: "Ordinance Regulating the Operation of Tricycles-for-Hire and Formulating Fare Matrices within Mapandan",
    description: "Mandates safety checks, standardized color coding by barangay, and sets transparent maximum passenger rates to prevent overcharging.",
    tags: ["PUBLIC SAFETY", "TRANSPORTATION"],
    dateApproved: new Date("2026-10-02T00:00:00Z"),
    status: "ACTIVE / ENFORCED",
  },
  {
    type: "RESOLUTION",
    referenceNumber: "Sangguniang Bayan Resolution No. 2026-150",
    title: "A Resolution Requesting the Department of Agriculture for the Provision of Organic Fertilizers and Seeds for Farmers in Mapandan",
    description: "Seeks crop support for farming associations to mitigate adverse weather impact and boost local production of palay and vegetables.",
    tags: ["AGRICULTURE", "LOCAL FARMERS", "GRANT REQUEST"],
    dateApproved: new Date("2026-08-25T00:00:00Z"),
    status: "ADOPTED / ONGOING REQUEST",
  },
  {
    type: "RESOLUTION",
    referenceNumber: "Sangguniang Bayan Resolution No. 2026-155",
    title: "A Resolution Expressing Deep Condolences on the Passing of Former Barangay Captain Jose Santos Sr.",
    description: "Honors the legacy, outstanding leadership, and dedicated public service of the late captain of Barangay Amanoaoac.",
    tags: ["HONORS", "CONDOLESCENCES", "CEREMONIAL"],
    dateApproved: new Date("2026-09-05T00:00:00Z"),
    status: "ADOPTED / CEREMONIAL",
  },
  {
    type: "RESOLUTION",
    referenceNumber: "Sangguniang Bayan Resolution No. 2026-160",
    title: "A Resolution Declaring Mapandan as a Green-Partner Zone and Supporting Nationwide Tree Planting Campaigns",
    description: "Declares active participation in reforestation efforts, schedules regular monthly community tree planting events across all 15 barangays.",
    tags: ["ENVIRONMENT", "COMMUNITY INITIATIVES"],
    dateApproved: new Date("2026-09-15T00:00:00Z"),
    status: "ADOPTED / CEREMONIAL",
  },
];

async function main() {
  console.log("Seeding legislative documents...");
  for (const doc of samples) {
    const existing = await (prisma as any).legislativeDocument.findFirst({
      where: { referenceNumber: doc.referenceNumber },
    });
    if (!existing) {
      await (prisma as any).legislativeDocument.create({
        data: doc,
      });
      console.log(`Created document: ${doc.referenceNumber}`);
    } else {
      console.log(`Document already exists: ${doc.referenceNumber}`);
    }
  }
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
