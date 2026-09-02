import prisma from "../lib/db/prisma";

async function main() {
    console.log("Seeding initial RHU Medical Equipment and demo records...");

    const count = await (prisma as any).medicalAsset.count();
    if (count > 0) {
        console.log(`Already has ${count} assets. Skipping seed.`);
        return;
    }

    const sampleAssets = [
        {
            assetTagNo: "PROP-2026-RHU-1001",
            equipmentName: "Automated External Defibrillator (AED)",
            brand: "Philips HeartStart FRx",
            serialNo: "PH-AED-88412",
            category: "PPE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 125000,
            currentStatus: "DEPLOYED_SERVICEABLE",
            currentFacility: "Main Rural Health Unit (RHU)",
            assignedRoom: "Emergency & Triage Room",
            accountablePerson: "Juan Dela Cruz, RN",
            documentReference: "PAR-2026-1001"
        },
        {
            assetTagNo: "PROP-2026-RHU-1002",
            equipmentName: "Digital Binocular Laboratory Microscope",
            brand: "Olympus CX23",
            serialNo: "OLY-9941-X",
            category: "PPE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 85000,
            currentStatus: "DEPLOYED_SERVICEABLE",
            currentFacility: "Main Rural Health Unit (RHU)",
            assignedRoom: "Laboratory & Diagnostics",
            accountablePerson: "Elena Santos, RMT",
            documentReference: "PAR-2026-1002"
        },
        {
            assetTagNo: "PROP-2026-RHU-1003",
            equipmentName: "Hydraulic Dental Examination Chair",
            brand: "A-dec 300 System",
            serialNo: "ADEC-3312",
            category: "PPE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 195000,
            currentStatus: "DEPLOYED_SERVICEABLE",
            currentFacility: "Main Rural Health Unit (RHU)",
            assignedRoom: "Dental Clinic",
            accountablePerson: "Dr. Roberto Reyes, DDM",
            documentReference: "PAR-2026-1003"
        },
        {
            assetTagNo: "PROP-2026-BHS-1004",
            equipmentName: "Aneroid Sphygmomanometer & Stethoscope Kit",
            brand: "Welch Allyn DS58",
            serialNo: "WA-88124-B",
            category: "SEMI_EXPENDABLE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 12500,
            currentStatus: "DEPLOYED_SERVICEABLE",
            currentFacility: "BHS Nilombot",
            assignedRoom: "Treatment & Examination Room",
            accountablePerson: "Maria Dela Cruz, RM",
            documentReference: "ICS-2026-1004"
        },
        {
            assetTagNo: "PROP-2026-BHS-1005",
            equipmentName: "Digital Pediatric Weighing Scale",
            brand: "Seca 354 Baby Scale",
            serialNo: "SECA-4412",
            category: "SEMI_EXPENDABLE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 18500,
            currentStatus: "DEPLOYED_SERVICEABLE",
            currentFacility: "BHS Baloling",
            assignedRoom: "Maternal & Child Health Room",
            accountablePerson: "Ana Ramos, RM",
            documentReference: "ICS-2026-1005"
        },
        {
            assetTagNo: "PROP-2026-RHU-1006",
            equipmentName: "Centrifuge Machine 8-Place",
            brand: "Hettich EBA 200",
            serialNo: "HET-1124-C",
            category: "SEMI_EXPENDABLE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 38000,
            currentStatus: "IN_STOCKROOM",
            currentFacility: "Main Rural Health Unit (RHU)",
            assignedRoom: "Central Stockroom",
            accountablePerson: "RHU Supply Custodian",
            documentReference: "ICS-2026-1006"
        },
        {
            assetTagNo: "PROP-2026-BHS-1007",
            equipmentName: "Emergency First Aid / Resuscitation Kit",
            brand: "Laerdal Compact Kit",
            serialNo: "LAER-0091",
            category: "SEMI_EXPENDABLE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 24000,
            currentStatus: "IN_STOCKROOM",
            currentFacility: "Main Rural Health Unit (RHU)",
            assignedRoom: "Central Stockroom",
            accountablePerson: "RHU Supply Custodian",
            documentReference: "ICS-2026-1007"
        },
        {
            assetTagNo: "PROP-2026-BHS-1008",
            equipmentName: "Doppler Fetal Heart Detector",
            brand: "Sonotrax Vascular Doppler",
            serialNo: "SONO-7721",
            category: "SEMI_EXPENDABLE",
            acquisitionSource: "LEGACY_BHS_EXISTING",
            unitCost: 9500,
            currentStatus: "PENDING_VERIFICATION",
            currentFacility: "BHS Torres",
            assignedRoom: "Consultation Area",
            accountablePerson: "Grace Bautista, RM",
            documentReference: "ICS-2026-1008"
        },
        {
            assetTagNo: "PROP-2026-BHS-1009",
            equipmentName: "Mobile Oxygen Tank Cylinder with Flowmeter",
            brand: "Luxfer Medical Grade",
            serialNo: "LUX-5519",
            category: "SEMI_EXPENDABLE",
            acquisitionSource: "STOCKROOM_ISSUANCE",
            unitCost: 14500,
            currentStatus: "DEFECTIVE_FOR_REPAIR",
            currentFacility: "BHS Pias",
            assignedRoom: "Treatment & Examination Room",
            accountablePerson: "Lourdes Garcia, RM",
            defectDetails: "Pressure gauge leak; requires valve gasket replacement.",
            documentReference: "ICS-2026-1009"
        }
    ];

    for (const a of sampleAssets) {
        await (prisma as any).medicalAsset.create({ data: a });
    }

    console.log(`Successfully seeded ${sampleAssets.length} medical equipment records!`);
}

main()
    .catch(e => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
