import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("⚙️ Upserting POSO Portal System Settings...");

    const posoSettings = [
        {
            key: "poso_location",
            value: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
            description: "Official POSO Office Address",
        },
        {
            key: "poso_hotline",
            value: "(075) 529-XXXX / +63 917 123 4567",
            description: "POSO Emergency & Incident Hotline Numbers",
        },
        {
            key: "poso_operating_hour",
            value: "Monday - Friday: 8:00 AM - 5:00 PM",
            description: "POSO Office Operating Hours",
        },
        {
            key: "poso_official_email",
            value: "poso@mapandan.gov.ph",
            description: "POSO Official Public Contact Email",
        },
        {
            key: "poso_facebook",
            value: "https://facebook.com/MapandanPOSO",
            description: "POSO Official Facebook Page Link",
        },
    ];

    for (const setting of posoSettings) {
        await prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: {
                value: setting.value,
                description: setting.description,
            },
            create: setting,
        });
        console.log(`  ✓ Upserted POSO setting: ${setting.key}`);
    }

    console.log("✅ POSO System Settings successfully updated in database!");
}

main()
    .catch((e) => {
        console.error("❌ Failed to upsert POSO settings:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
