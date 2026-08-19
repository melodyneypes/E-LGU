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
